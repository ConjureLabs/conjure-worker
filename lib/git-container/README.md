### Conjure Dockerfile Setup

Build the pr branch

```bash
# builds the dockerfile
. ./build.sh "git@github.com:WiskeyTango/mock-web-repo.git" <branch-name> <container-name> "npm install"
```

Now run that container in the background

```bash
docker run --cidfile /tmp/<container-name>.cid -i -t -d -p <host-port>:<container-port> <container-name> <command>
```

This will run the container, using the defined command, and will detach it.

---

If you want to run commands directly from within (to debug, etc), then:

```bash
docker exec -i -t $(cat /tmp/<container-name>.cid) bash
# you will now be kicked into the container bash
```

Then exit that session as you would a normal terminal instance.

---

To tail the logs, run:

```bash
docker logs -f $(cat /tmp/<container-name>.cid)
```

---

Once done, you'll need to spin it down.

```bash
# container id is found in /tmp/<container-name>.cid
docker kill $(cat /tmp/<container-name>.cid);
# need to wipe the old cid file
rm /tmp/<container-name>.cid;
```
