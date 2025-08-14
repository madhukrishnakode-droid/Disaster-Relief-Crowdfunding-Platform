# Aptos Disaster Relief Crowdfunding Platform

A decentralized crowdfunding platform built on the Aptos blockchain for disaster relief campaigns. This application allows users to create, donate to, and manage disaster relief campaigns using the Petra wallet.

## 🌟 Features

- **Wallet Integration**: Connect/disconnect with Petra wallet
- **Campaign Creation**: Create disaster relief campaigns with title, description, and funding goals
- **Donations**: Donate APT tokens to active campaigns
- **Progress Tracking**: Visual progress bars showing funding completion
- **Withdrawal**: Campaign owners can withdraw funds when goals are met
- **Real-time Updates**: Live campaign status and donation tracking
- **Responsive Design**: Modern UI with animated gradient backgrounds

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Blockchain**: Aptos
- **Wallet**: Petra Wallet Integration
- **Styling**: CSS3 with animated gradients and glassmorphism effects
- **Build Tool**: Vite

## 📋 Prerequisites

Before running this application, ensure you have:

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **Petra Wallet** browser extension installed
4. **Aptos account** with some APT tokens for testing
5. **Deployed Smart Contract** on Aptos blockchain

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd aptos-disaster-relief
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Deploy Smart Contract

Before running the frontend, deploy the smart contract:

1. **Install Aptos CLI**:
   ```bash
   curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
   ```

2. **Initialize Aptos Account**:
   ```bash
   aptos init
   ```

3. **Compile Contract**:
   ```bash
   aptos move compile --package-dir contract/
   ```

4. **Deploy Contract**:
   ```bash
   aptos move publish --package-dir contract/
   ```

5. **Initialize Contract** (call once after deployment):
   ```bash
   aptos move run --function-id "YOUR_ADDRESS::backend::initialize"
   ```

### 4. Configure Smart Contract Address

Update the `ADMIN_ADDRESS` in `src/App.tsx`:

```typescript
const ADMIN_ADDRESS = '0x19e69cef4912141bca40c0ac643684683de4c5ad7ed857450a8cb518c94ffb8a';
```

Replace with your deployed contract address.

### 5. Start Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
src/
├── App.tsx          # Main application component
├── App.css          # Component-specific styles
├── index.css        # Global styles with animations
├── main.tsx         # Application entry point
└── vite-env.d.ts    # Vite type definitions

contract/
└── backend.move     # Smart contract source code
```

## 🔧 Smart Contract Integration

This application includes a complete Move smart contract (`backend.move`) deployed on Aptos blockchain.

### Smart Contract Features

- **Campaign Management**: Create, fund, and withdraw from campaigns
- **Secure Fund Storage**: APT coins stored securely in contract
- **Owner Verification**: Only campaign owners can withdraw funds
- **Goal Tracking**: Automatic completion when goal is reached
- **Admin Controls**: Emergency functions for contract management

### Contract Structure

```move
module admin_address::backend {
    struct Campaign has store, drop, copy {
        owner: address,
        title: vector<u8>,
        description: vector<u8>,
        goal: u64,          // in octas (1 APT = 100,000,000 octas)
        donated: u64,       // in octas
        completed: bool,
        withdrawn: bool,
    }
    
    struct CampaignStore has key {
        campaigns: vector<Campaign>,
        next_id: u64,
    }
    
    struct CampaignFunds has key {
        funds: coin::Coin<AptosCoin>,
    }
}
```

### Entry Functions

1. **initialize**
   ```move
   public entry fun initialize(admin: &signer)
   ```
   - Initializes the contract storage
   - Must be called once after deployment

2. **create_campaign**
   ```move
   public entry fun create_campaign(
       creator: &signer,
       title: vector<u8>,
       description: vector<u8>,
       goal: u64
   )
   ```
   - Creates a new disaster relief campaign
   - Goal specified in octas (1 APT = 100,000,000 octas)

3. **donate**
   ```move
   public entry fun donate(
       donor: &signer,
       campaign_index: u64,
       amount: u64
   )
   ```
   - Donates APT to specified campaign
   - Amount in octas
   - Automatically marks campaign complete when goal reached

4. **withdraw**
   ```move
   public entry fun withdraw(
       owner: &signer,
       campaign_index: u64
   )
   ```
   - Allows campaign owner to withdraw funds
   - Only works for completed campaigns
   - Prevents double withdrawal

5. **admin_withdraw**
   ```move
   public entry fun admin_withdraw(
       admin: &signer,
       campaign_index: u64
   )
   ```
   - Emergency withdrawal function for admin
   - Returns funds to campaign owner

### View Functions

1. **get_campaign_count**: Returns total number of campaigns
2. **get_campaign**: Returns specific campaign details
3. **get_all_campaigns**: Returns all campaigns
4. **get_campaigns_by_owner**: Returns campaigns owned by specific address

## 🚀 Deployment Guide

### Contract Deployment

1. **Prepare Environment**:
   ```bash
   # Install Aptos CLI
   curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
   
   # Create new account or import existing
   aptos init --network testnet
   ```

2. **Fund Account** (for testnet):
   ```bash
   aptos account fund-with-faucet --account YOUR_ADDRESS
   ```

3. **Deploy Contract**:
   ```bash
   # Compile
   aptos move compile --package-dir ./
   
   # Publish
   aptos move publish --package-dir ./
   
   # Initialize after deployment
   aptos move run --function-id "YOUR_ADDRESS::backend::initialize"
   ```

4. **Verify Deployment**:
   ```bash
   aptos account list --query modules --account YOUR_ADDRESS
   ```

### Frontend Deployment

1. **Build for Production**:
   ```bash
   npm run build
   ```

2. **Deploy to Hosting Platform**:
   - Vercel: `vercel --prod`
   - Netlify: Drag build folder to Netlify
   - GitHub Pages: Push to gh-pages branch

## 🔍 Contract Interaction Examples

### Using Aptos CLI

1. **Create Campaign**:
   ```bash
   aptos move run \
     --function-id "CONTRACT_ADDRESS::backend::create_campaign" \
     --args string:"Hurricane Relief" string:"Emergency aid for hurricane victims" u64:1000000000
   ```

2. **Donate to Campaign**:
   ```bash
   aptos move run \
     --function-id "CONTRACT_ADDRESS::backend::donate" \
     --args u64:0 u64:100000000
   ```

3. **Check Campaign**:
   ```bash
   aptos move view \
     --function-id "CONTRACT_ADDRESS::backend::get_campaign" \
     --args u64:0
   ```

### Connecting Wallet

1. Click "Connect Petra Wallet" button
2. Approve connection in Petra wallet popup
3. Ensure you're on a supported network (Mainnet/Testnet/Devnet)

### Creating a Campaign

1. Connect your wallet
2. Fill in campaign details:
   - **Title**: Campaign name (max 100 characters)
   - **Description**: Campaign details (max 500 characters)
   - **Goal**: Target amount in APT tokens
3. Click "Create Campaign"
4. Approve transaction in Petra wallet

### Making Donations

1. Browse active campaigns
2. Enter donation amount in APT
3. Click "Donate" button
4. Approve transaction in Petra wallet

### Withdrawing Funds

1. Campaign must reach its goal
2. Only campaign owner can withdraw
3. Click "Withdraw Funds" button
4. Approve transaction in Petra wallet

## 🎨 UI Features

### Animated Background
- Multi-layer gradient animation
- Floating light orbs for depth
- Glassmorphism design elements

### Responsive Design
- Mobile-friendly layout
- Adaptive card design
- Visual progress indicators

### Error Handling
- User-friendly error messages
- Transaction status updates
- Network validation

## 🔍 Troubleshooting

### Common Issues

1. **"Generic Error" in Wallet**
   - Ensure smart contract is deployed and initialized
   - Verify contract address matches `ADMIN_ADDRESS` in App.tsx
   - Check function names match exactly
   - Ensure you called `initialize()` after deployment

2. **"Module Not Found"**
   - Contract not deployed to specified address
   - Wrong network selected (testnet vs mainnet)
   - Verify address with: `aptos account list --query modules --account YOUR_ADDRESS`

3. **"Function Not Found"**
   - Function names don't match contract
   - Contract not properly compiled/deployed
   - Check with: `aptos move view --function-id "ADDRESS::backend::get_campaign_count"`

4. **"Insufficient Balance"**
   - Not enough APT for transaction + gas fees
   - Use faucet for testnet: `aptos account fund-with-faucet --account YOUR_ADDRESS`

5. **Contract Not Initialized**
   - Call `initialize()` function after deployment
   - Only needs to be called once by deployer

### Network Issues

- **Testnet**: Use testnet faucet for APT tokens
- **Devnet**: Ensure contract is deployed on same network
- **Mainnet**: Use real APT tokens

## 🔒 Security Considerations

- Always verify transaction details before signing
- Only connect to trusted dApps
- Keep wallet credentials secure
- Audit smart contracts before mainnet deployment

## 📈 Future Enhancements

- [ ] Campaign categories and filtering
- [ ] Multi-token support (beyond APT)
- [ ] Campaign verification system
- [ ] Social sharing features
- [ ] Mobile app development
- [ ] Integration with disaster relief APIs
- [ ] Reputation system for campaign creators

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check [Aptos Documentation](https://aptos.dev/)
- Visit [Petra Wallet Support](https://petra.app/support)

## 🙏 Acknowledgments

- [Aptos Labs](https://aptoslabs.com/) for the blockchain platform
- [Petra Wallet](https://petra.app/) for wallet integration
- React and Vite communities for development tools

## Contract Detailes:
0xe18e6b8c0cc988a8577a51edd145a876fa7d34f1b75e4b3ab11690cb424d6ce4
![alt text](image.png)