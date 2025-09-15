// Example: How to create a partner/investor using Redux for current user

// In your Redux slice or component where you call the API
import { useSelector } from 'react-redux';

const CreatePartnerExample = () => {
    // Get current user from Redux state
    const currentUser = useSelector((state) => state.auth.user);

    const createPartner = async(partnerData) => {
        try {
            // Include current user ID from Redux in the request
            const requestBody = {
                ...partnerData,
                created_by: currentUser.id // This is the key change!
            };

            const response = await fetch('/api/equity/investors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (result.success) {
                console.log('Partner created successfully:', result.investor);
                // The accounting entries are automatically created:
                // 1. Partner equity account (3015-{partnerId})
                // 2. Journal entry with proper debit/credit
                // 3. Account balance updates
            } else {
                console.error('Error creating partner:', result.error);
            }

            return result;
        } catch (error) {
            console.error('API call failed:', error);
        }
    };

    // Example usage
    const handleCreatePartner = () => {
        const partnerData = {
            name: "John Doe Partner",
            email: "john@example.com",
            phone: "+1234567890",
            partner_type: "partner",
            initial_investment: 100000,
            equity_percentage: 20,
            notes: "New investor with significant capital"
                // created_by will be added automatically from Redux
        };

        createPartner(partnerData);
    };

    return ( <
        button onClick = { handleCreatePartner } >
        Create Partner <
        /button>
    );
};

export default CreatePartnerExample;

/* 
Chart of Accounts Strategy:

CURRENT IMPLEMENTATION (Recommended):
✅ Individual Partner Accounts
- Each partner gets their own equity account
- Account codes: 3015-1, 3015-2, 3015-3, etc.
- Benefits:
  - Easy to track individual partner investments
  - Clear partner balance reporting
  - Simplified financial statements
  - Better audit trail

ALTERNATIVE APPROACH:
❌ Single Partner Equity Account
- All partners share one account: 3015 - Partner Equity
- Use journal details to track individuals
- More complex reporting required

RECOMMENDATION: Keep current individual account approach!

Journal Entry Created Automatically:
- Debit: Cash (1010) - ₹100,000
- Credit: Partner Equity (3015-10) - ₹100,000
- Description: "Initial investment by partner John Doe Partner"
- Created by: Current logged-in user (from Redux)
*/