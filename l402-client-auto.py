#!/usr/bin/env python3
"""
Fully-automated L402 client for agents with an LND node.

Requirements: python3, requests, LND REST API access (lncli.sh or direct)

This version pays invoices automatically using your LND node's wallet.
"""

import requests
import base64
import json
import subprocess
import sys

API_URL = "https://dispatches.mystere.me/api/network"
LNCLI = "/data/.openclaw/workspace/lncli.sh"

def pay_invoice(bolt11):
    """Pay invoice via LND REST API. Returns preimage."""
    cmd = [
        "bash", LNCLI, "/v1/channels/transactions",
        "-X", "POST",
        "-d", json.dumps({"payment_request": bolt11})
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        data = json.loads(result.stdout)
        if "payment_preimage" in data:
            return data["payment_preimage"]
        elif data.get("payment_error"):
            print(f"Payment error: {data['payment_error']}")
            return None
        else:
            print(f"Unexpected response: {result.stdout[:200]}")
            return None
    except Exception as e:
        print(f"Payment failed: {e}")
        return None

def main():
    print("🔌 Calling L402 API (unpaid)...")

    # Step 1: Unpaid call
    r = requests.get(API_URL, timeout=10)

    if r.status_code == 200:
        print("✅ Endpoint returned data without payment (maybe free preview)")
        print(json.dumps(r.json(), indent=2))
        return

    if r.status_code != 402:
        print(f"❌ Unexpected status: {r.status_code}")
        print(r.text[:300])
        return

    # Step 2: Parse challenge
    l402 = r.headers.get("WWW-Authenticate", "")
    if "L402" not in l402:
        print("No L402 challenge in response")
        return

    parts = l402.replace("L402 ", "").split(",")
    token_b64 = parts[0].replace("token=", "").strip()
    invoice = parts[1].replace("invoice=", "").strip()

    print(f"⚡ Invoice: {invoice[:40]}...")

    # Step 3: Auto-pay
    print("💸 Auto-paying via LND...")
    preimage = pay_invoice(invoice)
    if not preimage:
        print("Payment failed. Exiting.")
        return

    # Step 4: Build proof
    proof = base64.b64encode(f"{token_b64}:{preimage}".encode()).decode()

    # Step 5: Call with proof
    print("📨 Sending proof-of-payment...")
    r2 = requests.get(API_URL, headers={"Authorization": f"L402 {proof}"}, timeout=10)

    if r2.status_code == 200:
        data = r2.json()
        print("\n✅ PAID — Data received:")
        print(json.dumps(data, indent=2))

        # Receipt for agent accounting
        receipt = {
            "timestamp": json.dumps(None),
            "resource": API_URL,
            "invoice": invoice,
            "preimage": preimage,
            "cost_sats": 10,
            "status": "success"
        }
        print("\n🧾 RECEIPT:")
        print(json.dumps(receipt, indent=2))
    else:
        print(f"\n❌ Failed: {r2.status_code}")
        print(r2.text[:300])

if __name__ == "__main__":
    main()
