# DC API Setup Guide

## Prerequisites

- An active paid Apple Developer Program membership is required.

---

## 1. Add DC API Capability and Configure Build ID

Perform the following steps for both the **EudiWallet** and **EudiReferenceWalletIDProvider** targets in Xcode.

### Steps

1. Open the project in Xcode and select the target.
2. Open the **Signing & Capabilities** tab.
3. Click **+ Capability** and add **DC API**.

4. Set the **Build ID** as follows:

| Target | Build ID |
|--------|---------|
| EudiWallet | Use reverse domain notation (e.g., `jp.co.acutus.Eudiwallet.dev`) |
| EudiReferenceWalletIDProvider | `{EudiWallet Build ID}.EudiReferenceWalletIDProvider` |

> **Note:** The Extension's Build ID must be prefixed with the main app's Build ID.  
> If they do not match, the following build error will occur: "Embedded binary's bundle identifier is not prefixed with the parent app's bundle identifier".

---

## 2. Match the Extension's Keychain Access Group with the Main App

Set `SHARED_APP_GROUP_IDENTIFIER` in the Build Settings of the **EudiReferenceWalletIDProvider** target to the same value as the main app.

### Steps

1. Select the **EudiReferenceWalletIDProvider** target.
2. Open the **Build Settings** tab.
3. Search for `SHARED_APP_GROUP_IDENTIFIER`.
4. Update the value for your build variant (e.g., Debug Dev, Release Dev) to match the main app's Bundle ID.

   Example (for Debug Dev):
   ```
   SHARED_APP_GROUP_IDENTIFIER = jp.co.acutus.EudiWallet.dev
   ```

---

## 3. Add Team ID to Build Settings

Add the Team ID as a User-Defined Setting in the Build Settings of the **EudiWallet** target.

### Steps

1. Select the **EudiWallet** target.
2. Open the **Build Settings** tab.
3. Click the **+** button and select **Add User-Defined Setting**.
4. Set the key to `APP_TEAM_ID` and the value to your Team ID.

   Example:
   ```
   APP_TEAM_ID = TEJFU2D4KV
   ```

   > **How to find your Team ID:**  
   > Visit the [Apple Developer Portal Membership details page](https://developer.apple.com/account#MembershipDetailsCard).
