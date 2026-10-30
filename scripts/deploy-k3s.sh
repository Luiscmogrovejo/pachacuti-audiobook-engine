#!/usr/bin/env bash
# Deploy pachacuti to a Kubernetes (k3s) cluster.
#
# Prerequisites:
#   1. KUBECONFIG points at the target cluster
#   2. Docker image built:  docker build -t pachacuti:<tag> .
#   3. k8s/secrets.yaml filled in with real values (not CHANGE_ME) and applied
#   4. CLUSTER_NODE set to an SSH host for the node that will import the image,
#      OR push the image to a registry and skip step 1 below.

set -euo pipefail

IMAGE_TAG="${1:-latest}"
CLUSTER_NODE="${CLUSTER_NODE:-<cluster-node-host>}"  # SSH alias or hostname

echo "=== Pachacuti k3s Deploy: $IMAGE_TAG ==="

# Step 1: Transfer the image to the cluster node's containerd
# (k3s has no local Docker daemon; alternatively push to a registry and pull.)
echo "[1/5] Saving and transferring Docker image..."
docker save "pachacuti:${IMAGE_TAG}" | ssh "$CLUSTER_NODE" "sudo k3s ctr images import -"

# Step 2: Apply k8s manifests
echo "[2/5] Applying kustomize manifests..."
kubectl apply -k k8s/

# Step 3: Wait for rollout
echo "[3/5] Waiting for deployment rollout..."
kubectl -n pachacuti rollout status deploy/pachacuti --timeout=120s
kubectl -n pachacuti rollout status deploy/cloudflared --timeout=120s

# Step 4: Verify pod health
echo "[4/5] Verifying pods..."
kubectl -n pachacuti get pods -o wide
kubectl -n pachacuti logs deploy/pachacuti --tail=5

# Step 5: Verify volume mounts
echo "[5/5] Verifying volume mounts..."
kubectl -n pachacuti exec deploy/pachacuti -- ls /app/dist/client/audio/chapters/ 2>/dev/null | head -5 || echo "  (audio dir empty -- needs PVC population)"
kubectl -n pachacuti exec deploy/pachacuti -- ls /app/dist/client/art/ 2>/dev/null | head -5 || echo "  (art dir empty -- needs PVC population)"

echo ""
echo "=== Deploy complete ==="
echo "Verify: curl -s https://<your-host>/api/health"
