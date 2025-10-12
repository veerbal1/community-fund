# Community Fund - Solana Anchor Project

A decentralized community funding platform built on Solana using the Anchor framework. This project implements proposal creation, access control, and user management for community-driven funding decisions.

## 📚 Learning Journey - Week 2: Multi-User Systems & Access Control

### Day 8 (Completed): Basic Access Control 🔐

**What I Built:**
- User profile initialization system
- Proposal creation with unique PDAs
- Owner-based proposal editing (only creator can edit)
- Comprehensive access control validation

**What I Learned:**
- PDA (Program Derived Address) derivation and seed composition
- Account space calculation with discriminators
- Owner checks using `has_one` constraint
- Counter-based unique account generation
- Testing failure scenarios with try-catch
- Byte encoding for seed generation (u64 to big-endian)

---

## 🏗️ Project Structure

```
community-fund/
├── programs/
│   └── community-fund/
│       └── src/
│           └── lib.rs          # Main program logic
├── tests/
│   └── community-fund.ts       # Test suite
├── Anchor.toml                 # Anchor configuration
└── README.md                   # This file
```

---

## 🚀 Features Implemented

### ✅ User Profile Management
- Initialize user profiles with unique PDAs
- Track proposal count per user
- Automatic counter increment

### ✅ Proposal Creation
- Create proposals with title, description, and amount requested
- Unique PDA generation using counter-based seeds
- Automatic timestamp recording
- Initial status set to "Pending"

### ✅ Proposal Updates
- Only proposal owner can edit their proposals
- Update title and description
- Owner validation using `has_one` constraint

### ✅ Access Control
- Seed-based validation (prevents unauthorized access)
- Owner verification for updates
- Proper error handling

---

## 📝 Data Structures

### UserProfile
```rust
pub struct UserProfile {
    pub proposal_count: u64,  // Number of proposals created
    pub bump: u8,              // PDA bump seed
}
```

### Proposal
```rust
pub struct Proposal {
    pub id: u64,                    // Proposal ID
    pub owner: Pubkey,              // Creator's public key
    pub title: String,              // Max 50 chars
    pub description: String,        // Max 200 chars
    pub amount_requested: u64,      // Amount in lamports
    pub status: ProposalStatus,     // Pending/Approved/Rejected
    pub created_at: i64,            // Unix timestamp
    pub vote_count: u64,            // Number of votes
    pub bump: u8,                   // PDA bump seed
}
```

### ProposalStatus
```rust
pub enum ProposalStatus {
    Pending,
    Approved,
    Rejected,
}
```

---

## 🔧 Setup & Installation

### Prerequisites
- Rust (latest stable)
- Solana CLI (v1.17+)
- Anchor CLI (v0.29+)
- Node.js (v16+)
- Yarn

### Install Dependencies
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Node dependencies
yarn install
```

### Build the Program
```bash
anchor build
```

### Run Tests
```bash
anchor test
```

---

## 🧪 Test Coverage

All tests passing ✅

1. **Initialize User** - Creates user profile with counter at 0
2. **Create Proposal** - Creates proposal with unique PDA and correct data
3. **Update Proposal** - Owner successfully updates their proposal
4. **Non-owner Cannot Update** - Unauthorized user blocked from updating (ConstraintSeeds error)

```bash
  community-fund
    ✔ Initialize user (245ms)
    ✔ Create proposal (460ms)
    ✔ Update proposal (461ms)
    ✔ Non owner cannot update proposal

  4 passing (1s)
```

---

## 🎯 Key Concepts Learned

### 1. PDA (Program Derived Address)
- Deterministic address generation from seeds
- Client and program independently derive same address
- Used for account ownership without private keys

**Example:**
```typescript
// Client-side PDA generation
const [userProfilePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("user_profile"), user.toBuffer()],
  programId
);
```

```rust
// On-chain validation
#[account(
  init,
  seeds=[b"user_profile", user.key().as_ref()],
  bump,
  payer = user,
  space = 8 + UserProfile::INIT_SPACE
)]
```

### 2. Account Space Calculation
Always remember: **8 bytes (discriminator) + data size**

```rust
space = 8 + UserProfile::INIT_SPACE
```

### 3. Counter-Based Unique PDAs
Using counters to generate unique addresses for multiple proposals per user:

```rust
seeds=[
  b"proposal",
  user.key().as_ref(),
  user_profile.proposal_count.to_be_bytes().as_ref()
]
```

### 4. Access Control Patterns
```rust
#[account(
  mut,
  seeds = [b"proposal", owner.key().as_ref(), proposal_id.to_be_bytes().as_ref()],
  bump = proposal.bump,
  has_one = owner  // Validates proposal.owner == owner.key()
)]
```

### 5. Testing Failure Cases
```typescript
try {
  await program.methods.updateProposal(...).rpc();
  expect.fail("Should have failed");
} catch (error) {
  expect(error.message).to.include("ConstraintSeeds");
}
```

---

## 🔄 Program Instructions

### `initialize_user`
Creates a user profile account.

**Accounts:**
- `user_profile` (init) - PDA derived from user's public key
- `user` (signer, mut) - User creating the profile
- `system_program` - System program

### `create_proposal`
Creates a new proposal with unique PDA.

**Parameters:**
- `title: String` - Proposal title (max 50 chars)
- `description: String` - Proposal description (max 200 chars)
- `amount_requested: u64` - Amount in lamports

**Accounts:**
- `user_profile` (mut) - User's profile (counter incremented)
- `proposal` (init) - New proposal account
- `user` (signer, mut) - Proposal creator
- `system_program` - System program

### `update_proposal`
Updates an existing proposal (owner only).

**Parameters:**
- `proposal_id: u64` - ID of proposal to update
- `new_title: String` - Updated title
- `new_description: String` - Updated description

**Accounts:**
- `owner` (signer) - Must be proposal creator
- `proposal` (mut) - Proposal to update

---

## 📅 Next Steps (Upcoming Days)

### Day 9: Admin Authority 👮
- [ ] Create admin account
- [ ] Admin can reject any proposal
- [ ] Implement authority hierarchy (Admin > User)

### Day 10: Multisig ✍️
- [ ] Three admin accounts
- [ ] 2-of-3 approval for high-value proposals (1000+ SOL)
- [ ] Multi-signature pattern implementation

### Day 11: Basic Voting 🗳️
- [ ] Community members can vote on proposals
- [ ] One person = one vote
- [ ] Vote counting mechanism

### Day 12: Weighted Voting + Deadline ⏰
- [ ] Token-based vote weighting
- [ ] 7-day voting deadline
- [ ] Clock sysvar integration

### Day 13: Auto-Finalization ✅
- [ ] Calculate winner after deadline
- [ ] Automatic SOL transfer to winner
- [ ] Result aggregation logic

---

## 🐛 Common Issues & Solutions

### Issue 1: `Cannot read properties of undefined`
**Cause:** Missing or incorrect environment variables
**Solution:** Use `program.programId` instead of `process.env.PROGRAM_ID`

### Issue 2: `AccountDidNotDeserialize`
**Cause:** Insufficient account space
**Solution:** Always include discriminator: `space = 8 + Struct::INIT_SPACE`

### Issue 3: `ConstraintSeeds`
**Cause:** PDA seeds don't match between client and program
**Solution:** Ensure byte encoding matches (use `writeBigUInt64BE` for u64 in TypeScript)

---

## 📚 Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Solana Program Library](https://spl.solana.com/)
- [Anchor Examples](https://github.com/coral-xyz/anchor/tree/master/tests)

---

## 🙏 Acknowledgments

Built as part of a 30-day Solana learning challenge, following a Socratic teaching approach to deeply understand Anchor framework concepts.

---

## 📄 License

MIT License - Feel free to use this code for learning purposes!

---

## 🎓 Key Takeaways

1. **PDAs are deterministic** - Same seeds always produce same address
2. **Space calculation matters** - Always add 8 bytes for discriminator
3. **Test failure cases** - Security comes from testing what should NOT work
4. **Byte encoding is critical** - TypeScript and Rust must match exactly
5. **Constraints are your friend** - Use `seeds`, `bump`, `has_one` for validation

---

**Day 8 Complete! 🎉**

*"Implemented access control. Your notes, your rules! 🔐"*
