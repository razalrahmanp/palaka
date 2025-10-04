```mermaid
graph TD
    subgraph "Bank Accounts"
        B1[Wood Work Bank<br/>₹0<br/>****3733]
        B2[ICICI BANK<br/>₹27,232<br/>****1396]
        B3[HDFC Bank<br/>₹6,34,020<br/>****8081]
        B4[Hashim SBI<br/>₹-10,136<br/>****2508]
    end
    
    subgraph "UPI Accounts"
        U1[Al rams Furniture UPI<br/>₹-13,85,539.95<br/>alramsfurniture@okhdfc]
        U2[Hashim UPI<br/>₹10,464<br/>hashim@alrams]
        U3[JABIR CHALISSERY UPI<br/>₹11,300<br/>JABI@ALRAMS]
        U4[Shahid UPI<br/>₹0<br/>shahidupi@woodwork]
    end
    
    subgraph "Cash Accounts"
        C1[CASH- AL RAMS<br/>₹1,07,57,874.03]
        C2[SHAHID - CASH<br/>₹1,07,57,874.03]
    end
    
    %% UPI to Bank Connections
    U1 -.->|LINKED| B3
    U2 -.->|LINKED| B4
    U4 -.->|LINKED| B1
    U3 -.->|NO LINK| X[❌ Unlinked]
    
    %% Styling
    classDef bankAccount fill:#e1f5fe
    classDef upiAccount fill:#f3e5f5
    classDef cashAccount fill:#e8f5e8
    classDef negative fill:#ffebee
    classDef warning fill:#fff3e0
    
    class B1,B2,B3,B4 bankAccount
    class U1,U2,U3,U4 upiAccount
    class C1,C2 cashAccount
    class B4,U1 negative
    class U3 warning
```

## 🔗 **Connection Mapping:**

| UPI Account | Bank Connection | Status | Balance Sync |
|-------------|----------------|--------|--------------|
| Al rams Furniture | ↔️ HDFC Bank | ⚠️ Mismatch | UPI: ₹-13.85L vs Bank: ₹6.34L |
| Hashim UPI | ↔️ Hashim SBI | ⚠️ Both Negative | UPI: ₹10K vs Bank: ₹-10K |
| Shahid UPI | ↔️ Wood Work | ✅ Synced | Both: ₹0 |
| JABIR CHALISSERY | ❌ No Link | ⚠️ Standalone | ₹11,300 (risky) |

## 📊 **Balance Analysis:**

### Positive Balances:
- ICICI BANK: ₹27,232 ✅
- HDFC: ₹6,34,020 ✅
- Hashim UPI: ₹10,464 ✅
- JABIR UPI: ₹11,300 ✅
- Cash Accounts: ₹21,51,574.06 total ✅

### Negative Balances:
- Hashim SBI: ₹-10,136 ⚠️
- Al rams Furniture UPI: ₹-13,85,539.95 ❌

### Net Position: ₹-7,12,660 (negative due to large UPI deficit)