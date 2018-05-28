// populated in a function
const cachedPlanById = {}

/*
  to run locally:
    source ./.hob/.env && node

    then

    const l = require('./lambda/billing')
    l.handler().then(() => { console.log('done') }) && 1
 */
module.exports.handler = async function heartbeatMonitor(/* event, context */) {
  const log = require('conjure-core/modules/log')('lambda.billing')
  require('../setup')(log)

  const { query, DatabaseTable } = require('@conjurelabs/db')

  const pendingBillingResult = await query(`
    SELECT
      ctlog.*,
      bp.account,
      bp.billing_plan,
      wr.org
    FROM container_transaction_log ctlog
    LEFT JOIN container c
      ON ctlog.container = c.id
    LEFT JOIN watched_repo wr
      ON c.repo = wr.id
    LEFT JOIN github_org_billing_plan bp
      ON wr.org = bp.org
    WHERE
      bp.deactivated IS NULL
      AND ctlog.billing_transaction IS NULL
      AND ctlog.action_end IS NULL
  `)

  const rowCount = pendingBillingResult.rows.length

  if (!rowCount) {
    log.info('no pending billing rows')
    return
  }

  /*
    grouping by account, and then by org within

    e.g.
    {
      // account id
      1: {
        // org id
        7: [
          // full row
          {...},
        ]
      }
    }
   */
  const countAccounts = 0
  const countOrgs = 0
  const tlogsByAccountOrgs = pendingBillingResult.rows.reduce((byAccountOrgs, row) => {
    if (!byAccountOrgs[ row.account ]) {
      countAccounts++
      byAccountOrgs[ row.account ] = {}
    }

    if (!byAccountOrgs[ row.account ][ row.org ]) {
      countOrgs++
      byAccountOrgs[ row.account ][ row.org ] = []
    }

    byAccountOrgs[ row.account ][ row.org ].push(row)
  }, {})

  log.info(`${countAccounts} account${countAccounts.length === 1 ? '' : 's'} (${countOrgs} org${countOrgs === 1 ? '' : 's'} total) will be billed`)

  // pulling caches needed
  await pullCaches()

  // processing each org
  const uuidv4 = require('uuid/v4')
  for (const account of tlogsByAccountOrgs) {
    const { accountRow, customer, cards, invalid } = await getAccountRecords(log, account)
    const transactionIdentifier = uuidv4()

    if (invalid === true) {
      continue
    }

    for (const org of tlogsByAccountOrgs[account]) {
      await processOrgBilling(log, org, transactionIdentifier, { row: accountRow, customer, cards }, tlogsByAccountOrgs[account][org])
    }
  }

  log.info(`update${rowCount === 1 ? '' : 's'} done`)
}

async function getAccountRecords(log, accountId) {
  const { DatabaseTable } = require('@conjurelabs/db')

  const accountRows = await DatabaseTable.select('account', {
    id: accountId
  })
  const accountRow = accountRows[0]

  const Customer = require('conjure-core/classes/Stripe/Customer')
  if (!accountRow.stripeId) {
    log.error(`Account ${accountId} does not have a stripe id`)
    return {
      invalid: true
    }
  }
  const customer = await Customer.retrieve(accountRow.id, accountRow.stripeId)

  const cardRows = await DatabaseTable.select('accountCard', {
    account: accountId
  })
  const Card = require('conjure-core/classes/Stripe/Card')
  const cards = cardRows
    .filter(card => {
      // should not be possible
      return typeof card.stripeId === 'string' && card.stripeId
    })
    .map(async card => {
      return await Card.retrieve(customer, card.stripeId)
    })

  return {
    accountRow,
    customer,
    cards
  }
}

async function pullCaches() {
  const { DatabaseTable } = require('@conjurelabs/db')

  const billingPlans = await DatabaseTable.select('billing_plan')

  for (const plan of billingPlans) {
    cachedPlanById[ plan.id ] = plan
  }
}

/*
log.info(`${rowCount} row${rowCount === 1 ? '' : 's'} container tlog items will be billed`)

  const batchAll = require('@conjurelabs/utils/Promise/batch-all')
  await batchAll(3, flatlineResult.rows, row => {
    return new DatabaseRow('container', row)
      .set({
        ecsState: 'failed',
        isActive: false,
        creationFailed: true,
        updated: new Date()
      })
      .save()
  })
 */
async function processOrgBilling(log, orgId, transactionIdentifier, accountResources, rows) {
  // reference to container rows, by id
  // used track pending row updates
  const rowCents = {}
  const buildCents = 0
  const ranCents = 0

  for (const row of rows) {
    switch (row.action) {
      case 'build':
        rowCents[ row.id ] = cachedPlanById[ row.billingPlan ].containerBuildFeeCents
        buildCents += rowCents[ row.id ]
        break

      case 'ran':
        const hourlyRunFee = cachedPlanById[ row.billingPlan ].containerHourlyRunningFeeCents

        if (hourlyRunFee === 0) {
          break
        }

        const hoursRan = (row.actionEnd - row.actionStart) / (1000 * 60 * 60)

        // should not happen
        if (Number.isNaN(hoursRan)) {
          log.error(`container tlog row ${row.id} has something wrong with its dates`)
          break
        }

        // taking floor to avoid possibility of overcharging
        rowCents[ row.id ] = Math.floor(hoursRan * hourlyRunFee)
        ranCents += rowCents[ row.id ]
        break

      default:
        // should not happen
        log.error(`container tlog row ${row.id} has an unsupported action type`)
        break
    }
  }

  const feeSum = buildCents + ranCents

  const friendlyMoney = feeSum.toString().split('')
  while (friendlyMoney.length < 3) {
    friendlyMoney.unshift('0')
  }
  friendlyMoney.unshift('$')
  friendlyMoney.splice(-2, 0, ',')
  log.info(`org ${orgId} (account ${accountResources.row.id}) being billing ${friendlyMoney.join('')}`)

  const Charge = require('conjure-core/classes/Stripe/Charge')

  // looping through cards until one works
  let billedAt = null
  for (const card of accountResources.cards) {
    const charge = new Charge(accountResources.customer, card, {
      amount: feeSum,
      currency: 'usd',
      receiptNumber: transactionIdentifier
    })

    try {
      await charge.save()
      billedAt = new Date()
    } catch(err) {
      // todo: check if card failure was due to card itself, and mark card as invalid
      log.error(err)
      continue
    }

    if (billedAt) {
      break
    }
  }

  const batchAll = require('@conjurelabs/utils/Promise/batch-all')
  const { DatabaseRow } = require('@conjurelabs/db')
  await batchAll(3, Object.keys(rowCents), rowId => {
    return DatabaseRow.update('containerTransactionLog', {
      billedAt,
      billedAmountCents: rowCents[rowId],
      transactionIdentifier,
      updated: new Date()
    }, {
      id: rowId
    })
  })
}
