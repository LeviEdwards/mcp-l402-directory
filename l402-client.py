#!/usr/bin/env python3
"""
Minimal L402 client — test the API at dispatches.mystere.me

Requirements: python3, requests, a Lightning wallet that can pay invoices.

Usage:
    python3 l402-client.py

Flow:
1. Call the endpoint (unpaid)
2. Receive L402 challenge (401 with invoice)
3. Pay the invoice with your wallet
4. Send proof-of-payment back
5. Get the data
"""

import requests
import base64
import json

API_URL = "https://dispatches.mystere.me/api/network"
WALLET = "<YOUR_LIGHTNING_WALLET_METHOD>"  # Replace: LN CLI, agent-wallet, etc.

def main():
    print("\n🔌 Calling L402 API...")

    # Step 1: Call unpaid — expect 402 Payment Required
    r = requests.get(API_URL, timeout=10)

    if r.status_code != 402:
        print(f"Unexpected status: {r.status_code}")
        print(r.text[:300])
        return

    # Step 2: Extract L402 challenge
    l402_header = r.headers.get("WWW-Authenticate", "")
    if "L402" not in l402_header:
        print("No L402 challenge found.")
        return

    # Parse "L402 token=<base64>, invoice=<bolt11>"
    parts = l402_header.replace("L402 ", "").split(",")
    token_b64 = parts[0].replace("token=", "").strip()
    invoice = parts[1].replace("invoice=", "").strip()

    print(f"  Challenge received")
    print(f"  Invoice: {invoice[:30]}...")

    # Step 3: Pay the invoice (manual or automated)
    print(f"\n⚡ Pay this invoice with your Lightning wallet:")
    print(f"   {invoice}\n")

    preimage = input("Paste the payment preimage here: ").strip()
    if not preimage:
        print("No preimage provided. Exiting.")
        return

    # Step 4: Build proof-of-payment
    proof = base64.b64encode(f"{token_b64}:{preimage}".encode()).decode()

    # Step 5: Call again with proof
    print("\n📨 Sending proof-of-payment...")
    r2 = requests.get(
        API_URL,
        headers={"Authorization": f"L402 {proof}"},
        timeout=10
    )

    if r2.status_code == 200:
        data = r2.json()
        print(f"\n✅ SUCCESS! Data received:")
        print(json.dumps(data, indent=2))

        # Receipt
        print(f"\n🧾 RECEIPT")
        print(f"   Resource: {API_URL}")
        print(f"   Status: PAID")
        print(f"   Invoice: {invoice[:40]}...")
        print(f"   Preimage: {preimage[:20]}...")
    else:
        print(f"\n❌ Failed: {r2.status_code}")
        print(r2.text[:300])

if __name__ == "__main__":
    main()
