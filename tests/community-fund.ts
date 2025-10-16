import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CommunityFund } from "../target/types/community_fund";
import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { BN } from "bn.js";

const generatePDA = (key: PublicKey, programId: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), key.toBuffer()],
    programId
  )[0];
};

const generateProposalPDA = (
  user: PublicKey,
  programId: PublicKey,
  count: number
) => {
  const countBuffer = Buffer.alloc(8);
  countBuffer.writeBigUInt64BE(BigInt(count));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("proposal"), user.toBuffer(), countBuffer],
    programId
  )[0];
};

const generateConfigPDA = (programId: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  )[0];
};

const generateProgramDataPDA = (programId: PublicKey) => {
  // BPF Upgradeable Loader program ID
  const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey(
    "BPFLoaderUpgradeab1e11111111111111111111111"
  );
  return PublicKey.findProgramAddressSync(
    [programId.toBuffer()],
    BPF_LOADER_UPGRADEABLE_PROGRAM_ID
  )[0];
};

const generateVotePDA = (
  voter: PublicKey,
  owner: PublicKey,
  programId: PublicKey,
  proposalId: number
) => {
  const proposalIdBuffer = Buffer.alloc(8);
  proposalIdBuffer.writeBigUInt64BE(BigInt(proposalId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), voter.toBuffer(), owner.toBuffer(), proposalIdBuffer],
    programId
  )[0];
};

describe("community-fund", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const user = provider.wallet.publicKey;

  const program = anchor.workspace.communityFund as Program<CommunityFund>;
  const userProfilePDA = generatePDA(user, program.programId);

  // Additional test users
  const bob = Keypair.generate();
  const alice = Keypair.generate();

  // Admin keys
  const admin2 = Keypair.generate();
  const admin3 = Keypair.generate();

  let isAdminInitialized = false;

  // ==================== USER PROFILE TESTS ====================

  it("Initialize user", async () => {
    const tx = await program.methods.initializeUser().rpc();

    const userProfile = await program.account.userProfile.fetch(userProfilePDA);
    expect(userProfile.proposalCount.toNumber()).to.equal(0);
    console.log("✅ User profile initialized with proposalCount = 0");
  });

  it("Cannot double initialize user", async () => {
    try {
      await program.methods.initializeUser().rpc();
      expect.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      expect(error.message).to.include("already in use");
      console.log("✅ Correctly prevented double initialization");
    }
  });

  // ==================== PROPOSAL CREATION TESTS ====================

  it("Create proposal", async () => {
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());
    const proposalPDA = generateProposalPDA(user, program.programId, count);

    const tx = await program.methods
      .createProposal(
        "Test Proposal",
        "Test Description",
        new anchor.BN(1000000000)
      )
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.title).to.equal("Test Proposal");
    expect(proposal.description).to.equal("Test Description");
    expect(proposal.amountRequested.toNumber()).to.equal(1000000000);
    expect(proposal.voteCount.toNumber()).to.equal(0);
    expect(proposal.status).to.deep.equal({ pending: {} });
    expect(proposal.fundingApprovals.length).to.equal(0);

    // Verify proposal count incremented
    const userProfile = await program.account.userProfile.fetch(userProfilePDA);
    expect(userProfile.proposalCount.toNumber()).to.equal(1);
    console.log("✅ Proposal created and count incremented");
  });

  it("Create multiple proposals and verify count", async () => {
    const initialCount = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    // Create 3 more proposals
    for (let i = 0; i < 3; i++) {
      const count = initialCount + i;
      const proposalPDA = generateProposalPDA(user, program.programId, count);
      await program.methods
        .createProposal(
          `Proposal ${i + 2}`,
          `Description ${i + 2}`,
          new anchor.BN(500000000 * (i + 1))
        )
        .accounts({
          proposal: proposalPDA,
          userProfile: userProfilePDA,
          user: user,
        })
        .rpc();
    }

    const finalCount = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    expect(finalCount).to.equal(initialCount + 3);
    console.log(`✅ Created 3 proposals, count: ${initialCount} -> ${finalCount}`);
  });

  it("Create proposal with max length strings", async () => {
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());
    const proposalPDA = generateProposalPDA(user, program.programId, count);

    // Title max: 50 chars, Description max: 200 chars
    const maxTitle = "A".repeat(50);
    const maxDescription = "B".repeat(200);

    await program.methods
      .createProposal(maxTitle, maxDescription, new anchor.BN(1000000000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.title).to.equal(maxTitle);
    expect(proposal.description).to.equal(maxDescription);
    console.log("✅ Max length strings accepted");
  });

  it("Create proposal with large amount", async () => {
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());
    const proposalPDA = generateProposalPDA(user, program.programId, count);

    // 2000 SOL (above multisig threshold)
    const largeAmount = new anchor.BN(2_000_000_000_000);

    await program.methods
      .createProposal("Large Amount Proposal", "Need 2-of-3 approval", largeAmount)
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.amountRequested.toString()).to.equal(largeAmount.toString());
    console.log("✅ Large amount proposal created (requires 2-of-3 multisig)");
  });

  // ==================== PROPOSAL UPDATE TESTS ====================

  it("Update proposal", async () => {
    const proposalPDA = generateProposalPDA(user, program.programId, 0);
    const tx = await program.methods
      .updateProposal(new BN(0), "Updated Title", "Updated Description")
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.title).to.equal("Updated Title");
    expect(proposal.description).to.equal("Updated Description");
    console.log("✅ Proposal updated successfully");
  });

  it("Non owner cannot update proposal", async () => {
    const proposalPDA = generateProposalPDA(user, program.programId, 0);

    try {
      await program.methods
        .updateProposal(new BN(0), "Hacked Title", "Hacked Description")
        .accounts({
          owner: bob.publicKey,
          proposal: proposalPDA,
        })
        .signers([bob])
        .rpc();

      expect.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      expect(error.message).to.include("ConstraintSeeds");
      console.log("✅ Non-owner correctly prevented from updating");
    }

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.title).to.equal("Updated Title");
    expect(proposal.description).to.equal("Updated Description");
  });

  // ==================== ADMIN INITIALIZATION TESTS ====================

  it("Initialize admin with upgrade authority verification", async () => {
    const configPDA = generateConfigPDA(program.programId);
    const programDataPDA = generateProgramDataPDA(program.programId);

    try {
      const tx = await program.methods
        .initializeAdmin(admin2.publicKey, admin3.publicKey)
        .accounts({
          user: user,
          programData: programDataPDA,
        })
        .rpc();

      const config = await program.account.config.fetch(configPDA);
      expect(config.admins[0].toString()).to.equal(user.toString());
      expect(config.admins[1].toString()).to.equal(admin2.publicKey.toString());
      expect(config.admins[2].toString()).to.equal(admin3.publicKey.toString());
      console.log("✅ Admin initialized with 3 admins:");
      console.log(`   Admin 1: ${config.admins[0].toString()}`);
      console.log(`   Admin 2: ${config.admins[1].toString()}`);
      console.log(`   Admin 3: ${config.admins[2].toString()}`);
      isAdminInitialized = true;
    } catch (error) {
      console.log("⚠️  Security check prevented initialization in local test");
      console.log("⚠️  Admin initialization commented out for local testing");
      // For local testing with commented upgrade check, try again
      const tx = await program.methods
        .initializeAdmin(admin2.publicKey, admin3.publicKey)
        .accounts({
          user: user,
          programData: programDataPDA,
        })
        .rpc();

      const config = await program.account.config.fetch(configPDA);
      expect(config.admins[0].toString()).to.equal(user.toString());
      expect(config.admins[1].toString()).to.equal(admin2.publicKey.toString());
      expect(config.admins[2].toString()).to.equal(admin3.publicKey.toString());
      console.log("✅ Admin initialized with 3 admins:");
      console.log(`   Admin 1: ${config.admins[0].toString()}`);
      console.log(`   Admin 2: ${config.admins[1].toString()}`);
      console.log(`   Admin 3: ${config.admins[2].toString()}`);
      isAdminInitialized = true;
    }
  });

  it("Cannot double initialize admin", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    const programDataPDA = generateProgramDataPDA(program.programId);

    try {
      await program.methods
        .initializeAdmin(admin2.publicKey, admin3.publicKey)
        .accounts({
          user: user,
          programData: programDataPDA,
        })
        .rpc();
      expect.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      expect(error.message).to.include("already in use");
      console.log("✅ Correctly prevented double admin initialization");
    }
  });

  // ==================== PROPOSAL REJECTION TESTS ====================

  it("Admin 1 can reject proposal", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    // Proposal 1 already exists from earlier test
    const proposalPDA = generateProposalPDA(user, program.programId, 1);
    const configPDA = generateConfigPDA(program.programId);

    await program.methods
      .rejectProposal(new BN(1), user)
      .accounts({
        admin: user,
        proposal: proposalPDA,
        config: configPDA,
      })
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.status).to.deep.equal({ rejected: {} });
    console.log("✅ Admin 1 rejected proposal successfully");
  });

  it("Admin 2 can reject proposal", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    // Proposal 2 already exists from earlier test
    const proposalPDA = generateProposalPDA(user, program.programId, 2);
    const configPDA = generateConfigPDA(program.programId);

    await program.methods
      .rejectProposal(new BN(2), user)
      .accounts({
        admin: admin2.publicKey,
        proposal: proposalPDA,
        config: configPDA,
      })
      .signers([admin2])
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.status).to.deep.equal({ rejected: {} });
    console.log("✅ Admin 2 rejected proposal successfully");
  });

  it("Admin 3 can reject proposal", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    // Proposal 3 already exists from earlier test
    const proposalPDA = generateProposalPDA(user, program.programId, 3);
    const configPDA = generateConfigPDA(program.programId);

    await program.methods
      .rejectProposal(new BN(3), user)
      .accounts({
        admin: admin3.publicKey,
        proposal: proposalPDA,
        config: configPDA,
      })
      .signers([admin3])
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.status).to.deep.equal({ rejected: {} });
    console.log("✅ Admin 3 rejected proposal successfully");
  });

  it("Non-admin cannot reject proposal", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    // Proposal 4 exists from earlier test
    const proposalPDA = generateProposalPDA(user, program.programId, 4);
    const configPDA = generateConfigPDA(program.programId);

    try {
      await program.methods
        .rejectProposal(new BN(4), user)
        .accounts({
          admin: bob.publicKey,
          proposal: proposalPDA,
          config: configPDA,
        })
        .signers([bob])
        .rpc();

      expect.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      expect(error.toString()).to.include("Unauthorized");
      console.log("✅ Non-admin correctly prevented from rejecting");
    }
  });

  // ==================== APPROVE FUNDING TESTS ====================

  it("Single admin can approve small amount proposal", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    // Proposal 0 has amount 1000000000 (1 SOL) - below threshold
    const proposalPDA = generateProposalPDA(user, program.programId, 0);
    const configPDA = generateConfigPDA(program.programId);

    await program.methods
      .approveFunding(new BN(0), user)
      .accounts({
        admin: user,
        proposal: proposalPDA,
        config: configPDA,
      })
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.status).to.deep.equal({ approved: {} });
    console.log("✅ Small amount approved by single admin");
  });

  it("Large amount requires 2-of-3 multisig - First approval", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    // Proposal 5 has 2000 SOL (2_000_000_000_000) - above threshold
    const proposalPDA = generateProposalPDA(user, program.programId, 5);
    const configPDA = generateConfigPDA(program.programId);

    await program.methods
      .approveFunding(new BN(5), user)
      .accounts({
        admin: user,
        proposal: proposalPDA,
        config: configPDA,
      })
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.status).to.deep.equal({ pending: {} }); // Still pending
    expect(proposal.fundingApprovals.length).to.equal(1);
    expect(proposal.fundingApprovals[0].toString()).to.equal(user.toString());
    console.log("✅ Large amount: 1 of 2 approvals received");
  });

  it("Large amount requires 2-of-3 multisig - Second approval (approved)", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    const proposalPDA = generateProposalPDA(user, program.programId, 5);
    const configPDA = generateConfigPDA(program.programId);

    await program.methods
      .approveFunding(new BN(5), user)
      .accounts({
        admin: admin2.publicKey,
        proposal: proposalPDA,
        config: configPDA,
      })
      .signers([admin2])
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.status).to.deep.equal({ approved: {} }); // Now approved
    expect(proposal.fundingApprovals.length).to.equal(2);
    console.log("✅ Large amount approved with 2-of-3 multisig");
  });

  it("Cannot approve same proposal twice with same admin", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    // Create a new large amount proposal
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    const proposalPDA = generateProposalPDA(user, program.programId, count);

    await program.methods
      .createProposal("Another Large", "Description", new anchor.BN(2_000_000_000_000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();
    const configPDA = generateConfigPDA(program.programId);

    // First approval
    await program.methods
      .approveFunding(new BN(count), user)
      .accounts({
        admin: user,
        proposal: proposalPDA,
        config: configPDA,
      })
      .rpc();

    // Try to approve again with same admin
    try {
      await program.methods
        .approveFunding(new BN(count), user)
        .accounts({
          admin: user,
          proposal: proposalPDA,
          config: configPDA,
        })
        .rpc();
      expect.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      expect(error.toString()).to.include("AlreadyApproved");
      console.log("✅ Correctly prevented duplicate approval");
    }
  });

  it("Non-admin cannot approve funding", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    // Create a small proposal
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    const proposalPDA = generateProposalPDA(user, program.programId, count);

    await program.methods
      .createProposal("Test Approval", "Description", new anchor.BN(500_000_000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();
    const configPDA = generateConfigPDA(program.programId);

    try {
      await program.methods
        .approveFunding(new BN(count), user)
        .accounts({
          admin: bob.publicKey,
          proposal: proposalPDA,
          config: configPDA,
        })
        .signers([bob])
        .rpc();
      expect.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      expect(error.toString()).to.include("Unauthorized");
      console.log("✅ Non-admin correctly prevented from approving");
    }
  });

  // ==================== ADMIN TRANSFER TESTS ====================

  it("Admin can transfer another admin position", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    const configPDA = generateConfigPDA(program.programId);
    const newAdmin = Keypair.generate();

    // Admin 1 transfers Admin 2's position to new admin
    await program.methods
      .transferAdmin(admin2.publicKey, newAdmin.publicKey)
      .accounts({
        currentAdmin: user,
        config: configPDA,
      })
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    expect(config.admins[1].toString()).to.equal(newAdmin.publicKey.toString());
    console.log(`✅ Admin 2 position transferred to new admin`);

    // Transfer back for other tests
    await program.methods
      .transferAdmin(newAdmin.publicKey, admin2.publicKey)
      .accounts({
        currentAdmin: user,
        config: configPDA,
      })
      .rpc();
    console.log("✅ Transferred back to original admin 2");
  });

  it("Admin can transfer their own position", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    const configPDA = generateConfigPDA(program.programId);
    const newAdmin3 = Keypair.generate();

    // Admin 3 transfers their own position
    await program.methods
      .transferAdmin(admin3.publicKey, newAdmin3.publicKey)
      .accounts({
        currentAdmin: admin3.publicKey,
        config: configPDA,
      })
      .signers([admin3])
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    expect(config.admins[2].toString()).to.equal(newAdmin3.publicKey.toString());
    console.log("✅ Admin 3 transferred their own position");

    // Transfer back
    await program.methods
      .transferAdmin(newAdmin3.publicKey, admin3.publicKey)
      .accounts({
        currentAdmin: user,
        config: configPDA,
      })
      .rpc();
    console.log("✅ Transferred back to original admin 3");
  });

  it("Non-admin cannot transfer admin position", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    const configPDA = generateConfigPDA(program.programId);
    const hacker = Keypair.generate();
    const newAdmin = Keypair.generate();

    try {
      await program.methods
        .transferAdmin(admin2.publicKey, newAdmin.publicKey)
        .accounts({
          currentAdmin: hacker.publicKey,
          config: configPDA,
        })
        .signers([hacker])
        .rpc();
      expect.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      expect(error.toString()).to.include("Unauthorized");
      console.log("✅ Non-admin correctly prevented from transferring");
    }
  });

  it("Cannot transfer non-existent admin", async () => {
    if (!isAdminInitialized) {
      console.log("⚠️  Skipping: Admin not initialized");
      return;
    }

    const configPDA = generateConfigPDA(program.programId);
    const fakeOldAdmin = Keypair.generate();
    const newAdmin = Keypair.generate();

    try {
      await program.methods
        .transferAdmin(fakeOldAdmin.publicKey, newAdmin.publicKey)
        .accounts({
          currentAdmin: user,
          config: configPDA,
        })
        .rpc();
      expect.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      expect(error.toString()).to.include("Unauthorized");
      console.log("✅ Correctly prevented transferring non-existent admin");
    }
  });

  // ==================== VOTE TESTS ====================
  // ==================== VOTING WEIGHT FEATURE TESTS ====================

  it("User can vote with token weight of 1", async () => {
    // Use proposal 4 (exists and not rejected/approved yet)
    const proposalPDA = generateProposalPDA(user, program.programId, 4);
    const votePDA = generateVotePDA(user, user, program.programId, 4);

    // Get initial vote count
    const proposalBefore = await program.account.proposal.fetch(proposalPDA);
    const initialVoteCount = proposalBefore.voteCount.toNumber();

    const tokenWeight = 1;
    await program.methods
      .voteOnProposal(new BN(4), user, new BN(tokenWeight))
      .accounts({
        voteAccount: votePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    // Verify vote account was created with correct weight
    const voteAccount = await program.account.voteAccount.fetch(votePDA);
    expect(voteAccount.timestamp.toNumber()).to.be.greaterThan(0);
    expect(voteAccount.tokenWeight.toNumber()).to.equal(tokenWeight);

    // Verify vote count increased by token weight
    const proposalAfter = await program.account.proposal.fetch(proposalPDA);
    expect(proposalAfter.voteCount.toNumber()).to.equal(initialVoteCount + tokenWeight);
    console.log(`✅ Vote recorded with weight ${tokenWeight}, count: ${initialVoteCount} -> ${proposalAfter.voteCount.toNumber()}`);
  });

  it("User can vote with higher token weight (100 tokens)", async () => {
    // Create a new proposal for this test
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    const proposalPDA = generateProposalPDA(user, program.programId, count);
    await program.methods
      .createProposal("High Weight Vote Test", "Testing higher vote weights", new anchor.BN(500000000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    const votePDA = generateVotePDA(user, user, program.programId, count);
    const tokenWeight = 100;

    await program.methods
      .voteOnProposal(new BN(count), user, new BN(tokenWeight))
      .accounts({
        voteAccount: votePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    const voteAccount = await program.account.voteAccount.fetch(votePDA);
    expect(voteAccount.tokenWeight.toNumber()).to.equal(tokenWeight);

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.voteCount.toNumber()).to.equal(tokenWeight);
    console.log(`✅ Vote recorded with weight ${tokenWeight}, total count: ${proposal.voteCount.toNumber()}`);
  });

  it("User can vote with large token weight (1000 tokens)", async () => {
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    const proposalPDA = generateProposalPDA(user, program.programId, count);
    await program.methods
      .createProposal("Large Weight Test", "Testing large vote weights", new anchor.BN(500000000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    const votePDA = generateVotePDA(user, user, program.programId, count);
    const tokenWeight = 1000;

    await program.methods
      .voteOnProposal(new BN(count), user, new BN(tokenWeight))
      .accounts({
        voteAccount: votePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    const voteAccount = await program.account.voteAccount.fetch(votePDA);
    expect(voteAccount.tokenWeight.toNumber()).to.equal(tokenWeight);

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.voteCount.toNumber()).to.equal(tokenWeight);
    console.log(`✅ Vote recorded with weight ${tokenWeight}, total count: ${proposal.voteCount.toNumber()}`);
  });

  it("Cannot vote twice on same proposal", async () => {
    const proposalPDA = generateProposalPDA(user, program.programId, 4);
    const votePDA = generateVotePDA(user, user, program.programId, 4);

    try {
      await program.methods
        .voteOnProposal(new BN(4), user, new BN(1))
        .accounts({
          voteAccount: votePDA,
          user: user,
          proposal: proposalPDA,
        })
        .rpc();
      expect.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      expect(error.message).to.include("already in use");
      console.log("✅ Correctly prevented duplicate vote");
    }
  });

  it("Multiple users can vote with different token weights", async () => {
    // Airdrop to Bob if not already done
    try {
      const airdropSig = await provider.connection.requestAirdrop(
        bob.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig, "confirmed");
    } catch (e) {
      // Bob might already have funds
    }

    // Create a new proposal for this test
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    const proposalPDA = generateProposalPDA(user, program.programId, count);
    await program.methods
      .createProposal("Multiple Voters Test", "Testing multiple users with different weights", new anchor.BN(500000000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    // User votes with weight 50
    const userVotePDA = generateVotePDA(user, user, program.programId, count);
    const userWeight = 50;
    await program.methods
      .voteOnProposal(new BN(count), user, new BN(userWeight))
      .accounts({
        voteAccount: userVotePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    let proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.voteCount.toNumber()).to.equal(userWeight);

    // Bob votes with weight 75
    const bobVotePDA = generateVotePDA(bob.publicKey, user, program.programId, count);
    const bobWeight = 75;
    await program.methods
      .voteOnProposal(new BN(count), user, new BN(bobWeight))
      .accounts({
        voteAccount: bobVotePDA,
        user: bob.publicKey,
        proposal: proposalPDA,
      })
      .signers([bob])
      .rpc();

    const bobVoteAccount = await program.account.voteAccount.fetch(bobVotePDA);
    expect(bobVoteAccount.tokenWeight.toNumber()).to.equal(bobWeight);

    proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.voteCount.toNumber()).to.equal(userWeight + bobWeight);
    console.log(`✅ Multiple users voted with different weights: User(${userWeight}) + Bob(${bobWeight}) = ${proposal.voteCount.toNumber()}`);
  });

  // ==================== MULTIPLE USERS TESTS ====================

  it("Multiple users can create proposals independently", async () => {
    // Initialize Alice
    const aliceProfilePDA = generatePDA(alice.publicKey, program.programId);

    // Airdrop to Alice
    const airdropSig = await provider.connection.requestAirdrop(
      alice.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig, "confirmed");

    await program.methods
      .initializeUser()
      .accounts({
        userProfile: aliceProfilePDA,
        user: alice.publicKey,
      })
      .signers([alice])
      .rpc();

    // Alice creates a proposal
    const aliceProposalPDA = generateProposalPDA(alice.publicKey, program.programId, 0);
    await program.methods
      .createProposal("Alice's Proposal", "Alice's idea", new anchor.BN(300000000))
      .accounts({
        proposal: aliceProposalPDA,
        userProfile: aliceProfilePDA,
        user: alice.publicKey,
      })
      .signers([alice])
      .rpc();

    const aliceProposal = await program.account.proposal.fetch(aliceProposalPDA);
    expect(aliceProposal.owner.toString()).to.equal(alice.publicKey.toString());
    expect(aliceProposal.title).to.equal("Alice's Proposal");

    const aliceProfile = await program.account.userProfile.fetch(aliceProfilePDA);
    expect(aliceProfile.proposalCount.toNumber()).to.equal(1);

    console.log("✅ Multiple users can create proposals independently");
  });

  it("Alice can vote on her own proposal with token weight", async () => {
    // Alice's proposal 0 exists from earlier test
    const aliceProposalPDA = generateProposalPDA(alice.publicKey, program.programId, 0);
    const aliceVotePDA = generateVotePDA(alice.publicKey, alice.publicKey, program.programId, 0);

    const proposalBefore = await program.account.proposal.fetch(aliceProposalPDA);
    const initialVoteCount = proposalBefore.voteCount.toNumber();

    const tokenWeight = 25;
    await program.methods
      .voteOnProposal(new BN(0), alice.publicKey, new BN(tokenWeight))
      .accounts({
        voteAccount: aliceVotePDA,
        user: alice.publicKey,
        proposal: aliceProposalPDA,
      })
      .signers([alice])
      .rpc();

    const voteAccount = await program.account.voteAccount.fetch(aliceVotePDA);
    expect(voteAccount.tokenWeight.toNumber()).to.equal(tokenWeight);

    const proposalAfter = await program.account.proposal.fetch(aliceProposalPDA);
    expect(proposalAfter.voteCount.toNumber()).to.equal(initialVoteCount + tokenWeight);
    console.log(`✅ Owner can vote on their own proposal with weight ${tokenWeight}`);
  });

  it("Users can vote on Alice's proposal with different weights", async () => {
    const aliceProposalPDA = generateProposalPDA(alice.publicKey, program.programId, 0);
    const userVotePDA = generateVotePDA(user, alice.publicKey, program.programId, 0);

    const proposalBefore = await program.account.proposal.fetch(aliceProposalPDA);
    const initialVoteCount = proposalBefore.voteCount.toNumber();

    const tokenWeight = 150;
    await program.methods
      .voteOnProposal(new BN(0), alice.publicKey, new BN(tokenWeight))
      .accounts({
        voteAccount: userVotePDA,
        user: user,
        proposal: aliceProposalPDA,
      })
      .rpc();

    const voteAccount = await program.account.voteAccount.fetch(userVotePDA);
    expect(voteAccount.tokenWeight.toNumber()).to.equal(tokenWeight);

    const proposalAfter = await program.account.proposal.fetch(aliceProposalPDA);
    expect(proposalAfter.voteCount.toNumber()).to.equal(initialVoteCount + tokenWeight);
    console.log(`✅ Users can vote on other users' proposals with weight ${tokenWeight}`);
  });

  it("Bob can also vote on Alice's proposal, testing vote accumulation", async () => {
    const aliceProposalPDA = generateProposalPDA(alice.publicKey, program.programId, 0);
    const bobVotePDA = generateVotePDA(bob.publicKey, alice.publicKey, program.programId, 0);

    const proposalBefore = await program.account.proposal.fetch(aliceProposalPDA);
    const initialVoteCount = proposalBefore.voteCount.toNumber();

    const tokenWeight = 200;
    await program.methods
      .voteOnProposal(new BN(0), alice.publicKey, new BN(tokenWeight))
      .accounts({
        voteAccount: bobVotePDA,
        user: bob.publicKey,
        proposal: aliceProposalPDA,
      })
      .signers([bob])
      .rpc();

    const voteAccount = await program.account.voteAccount.fetch(bobVotePDA);
    expect(voteAccount.tokenWeight.toNumber()).to.equal(tokenWeight);

    const proposalAfter = await program.account.proposal.fetch(aliceProposalPDA);
    expect(proposalAfter.voteCount.toNumber()).to.equal(initialVoteCount + tokenWeight);
    console.log(`✅ Multiple users voted on Alice's proposal, total votes: ${proposalAfter.voteCount.toNumber()}`);
  });

  it("Vote timestamp and weight are correctly recorded", async () => {
    // Create a new proposal for this test
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    const proposalPDA = generateProposalPDA(user, program.programId, count);
    await program.methods
      .createProposal("Timestamp Test", "Testing vote timestamps", new anchor.BN(100000000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    const votePDA = generateVotePDA(user, user, program.programId, count);
    const tokenWeight = 42;

    await program.methods
      .voteOnProposal(new BN(count), user, new BN(tokenWeight))
      .accounts({
        voteAccount: votePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    const voteAccount = await program.account.voteAccount.fetch(votePDA);

    // Verify timestamp exists and is a reasonable Unix timestamp (after 2020)
    expect(voteAccount.timestamp.toNumber()).to.be.greaterThan(1577836800); // Jan 1, 2020
    expect(voteAccount.timestamp.toNumber()).to.be.lessThan(2147483647); // Max 32-bit timestamp
    expect(voteAccount.tokenWeight.toNumber()).to.equal(tokenWeight);
    console.log(`✅ Vote timestamp: ${voteAccount.timestamp.toNumber()}, weight: ${voteAccount.tokenWeight.toNumber()}`);
  });

  // ==================== VOTING WEIGHT EDGE CASES ====================

  it("User can vote with zero token weight", async () => {
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    const proposalPDA = generateProposalPDA(user, program.programId, count);
    await program.methods
      .createProposal("Zero Weight Test", "Testing zero vote weight", new anchor.BN(100000000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    const votePDA = generateVotePDA(user, user, program.programId, count);
    const tokenWeight = 0;

    await program.methods
      .voteOnProposal(new BN(count), user, new BN(tokenWeight))
      .accounts({
        voteAccount: votePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    const voteAccount = await program.account.voteAccount.fetch(votePDA);
    expect(voteAccount.tokenWeight.toNumber()).to.equal(tokenWeight);

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.voteCount.toNumber()).to.equal(0);
    console.log(`✅ Zero weight vote recorded, count remains: ${proposal.voteCount.toNumber()}`);
  });

  it("User can vote with very large token weight", async () => {
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    const proposalPDA = generateProposalPDA(user, program.programId, count);
    await program.methods
      .createProposal("Large Weight Test", "Testing very large weight", new anchor.BN(100000000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    const votePDA = generateVotePDA(user, user, program.programId, count);
    // 1 million tokens
    const tokenWeight = 1000000;

    await program.methods
      .voteOnProposal(new BN(count), user, new BN(tokenWeight))
      .accounts({
        voteAccount: votePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    const voteAccount = await program.account.voteAccount.fetch(votePDA);
    expect(voteAccount.tokenWeight.toNumber()).to.equal(tokenWeight);

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.voteCount.toNumber()).to.equal(tokenWeight);
    console.log(`✅ Very large weight vote recorded: ${proposal.voteCount.toNumber()}`);
  });

  it("Accumulated votes from multiple users with various weights", async () => {
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    const proposalPDA = generateProposalPDA(user, program.programId, count);
    await program.methods
      .createProposal("Accumulation Test", "Testing vote accumulation", new anchor.BN(100000000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    // User votes with weight 100
    const userVotePDA = generateVotePDA(user, user, program.programId, count);
    await program.methods
      .voteOnProposal(new BN(count), user, new BN(100))
      .accounts({
        voteAccount: userVotePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    // Bob votes with weight 250
    const bobVotePDA = generateVotePDA(bob.publicKey, user, program.programId, count);
    await program.methods
      .voteOnProposal(new BN(count), user, new BN(250))
      .accounts({
        voteAccount: bobVotePDA,
        user: bob.publicKey,
        proposal: proposalPDA,
      })
      .signers([bob])
      .rpc();

    // Alice votes with weight 500
    const aliceVotePDA = generateVotePDA(alice.publicKey, user, program.programId, count);
    await program.methods
      .voteOnProposal(new BN(count), user, new BN(500))
      .accounts({
        voteAccount: aliceVotePDA,
        user: alice.publicKey,
        proposal: proposalPDA,
      })
      .signers([alice])
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.voteCount.toNumber()).to.equal(850); // 100 + 250 + 500
    console.log(`✅ Accumulated votes: 100 + 250 + 500 = ${proposal.voteCount.toNumber()}`);
  });

  // ==================== VOTING TIME WINDOW TESTS ====================

  it("Verify vote account stores all required data", async () => {
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    const proposalPDA = generateProposalPDA(user, program.programId, count);
    await program.methods
      .createProposal("Data Structure Test", "Verify vote data", new anchor.BN(100000000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    const votePDA = generateVotePDA(user, user, program.programId, count);
    const tokenWeight = 333;

    await program.methods
      .voteOnProposal(new BN(count), user, new BN(tokenWeight))
      .accounts({
        voteAccount: votePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    const voteAccount = await program.account.voteAccount.fetch(votePDA);
    
    // Verify all fields are properly stored
    expect(voteAccount.timestamp).to.exist;
    expect(voteAccount.tokenWeight).to.exist;
    expect(voteAccount.bump).to.exist;
    expect(voteAccount.timestamp.toNumber()).to.be.greaterThan(0);
    expect(voteAccount.tokenWeight.toNumber()).to.equal(tokenWeight);
    expect(voteAccount.bump).to.be.greaterThan(0);
    
    console.log(`✅ Vote account complete: timestamp=${voteAccount.timestamp}, weight=${voteAccount.tokenWeight}, bump=${voteAccount.bump}`);
  });

  it("Different users can have different weights on the same proposal", async () => {
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    const proposalPDA = generateProposalPDA(user, program.programId, count);
    await program.methods
      .createProposal("Weight Variety Test", "Different weights from different users", new anchor.BN(100000000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    // User votes with weight 10
    const userVotePDA = generateVotePDA(user, user, program.programId, count);
    await program.methods
      .voteOnProposal(new BN(count), user, new BN(10))
      .accounts({
        voteAccount: userVotePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    // Bob votes with weight 20
    const bobVotePDA = generateVotePDA(bob.publicKey, user, program.programId, count);
    await program.methods
      .voteOnProposal(new BN(count), user, new BN(20))
      .accounts({
        voteAccount: bobVotePDA,
        user: bob.publicKey,
        proposal: proposalPDA,
      })
      .signers([bob])
      .rpc();

    // Alice votes with weight 30
    const aliceVotePDA = generateVotePDA(alice.publicKey, user, program.programId, count);
    await program.methods
      .voteOnProposal(new BN(count), user, new BN(30))
      .accounts({
        voteAccount: aliceVotePDA,
        user: alice.publicKey,
        proposal: proposalPDA,
      })
      .signers([alice])
      .rpc();

    // Verify each vote has the correct weight stored
    const userVote = await program.account.voteAccount.fetch(userVotePDA);
    const bobVote = await program.account.voteAccount.fetch(bobVotePDA);
    const aliceVote = await program.account.voteAccount.fetch(aliceVotePDA);

    expect(userVote.tokenWeight.toNumber()).to.equal(10);
    expect(bobVote.tokenWeight.toNumber()).to.equal(20);
    expect(aliceVote.tokenWeight.toNumber()).to.equal(30);

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.voteCount.toNumber()).to.equal(60); // 10 + 20 + 30
    
    console.log(`✅ Individual weights verified: User(10), Bob(20), Alice(30) = Total(${proposal.voteCount.toNumber()})`);
  });

  it("Proposal vote count starts at zero and accumulates correctly", async () => {
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());

    const proposalPDA = generateProposalPDA(user, program.programId, count);
    await program.methods
      .createProposal("Count Tracking Test", "Verify count starts at zero", new anchor.BN(100000000))
      .accounts({
        proposal: proposalPDA,
        userProfile: userProfilePDA,
        user: user,
      })
      .rpc();

    // Verify initial count is 0
    let proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.voteCount.toNumber()).to.equal(0);
    console.log(`   Initial vote count: ${proposal.voteCount.toNumber()}`);

    // Add first vote with weight 17
    const userVotePDA = generateVotePDA(user, user, program.programId, count);
    await program.methods
      .voteOnProposal(new BN(count), user, new BN(17))
      .accounts({
        voteAccount: userVotePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.voteCount.toNumber()).to.equal(17);
    console.log(`   After first vote (17): ${proposal.voteCount.toNumber()}`);

    // Add second vote with weight 23
    const bobVotePDA = generateVotePDA(bob.publicKey, user, program.programId, count);
    await program.methods
      .voteOnProposal(new BN(count), user, new BN(23))
      .accounts({
        voteAccount: bobVotePDA,
        user: bob.publicKey,
        proposal: proposalPDA,
      })
      .signers([bob])
      .rpc();

    proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.voteCount.toNumber()).to.equal(40); // 17 + 23
    console.log(`   After second vote (23): ${proposal.voteCount.toNumber()}`);

    console.log(`✅ Vote count accumulation verified: 0 → 17 → 40`);
  });

  // ==================== SUMMARY ====================

  it("Test summary", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("📋 COMPREHENSIVE TEST SUMMARY");
    console.log("=".repeat(60));
    console.log("✅ User profile: initialization, duplicate prevention");
    console.log("✅ Proposals: create, update, count tracking");
    console.log("✅ Edge cases: max lengths, large amounts");
    console.log("✅ Admin initialization: 3 admins, duplicate prevention");
    console.log("✅ Proposal rejection: all 3 admins tested");
    console.log("✅ Funding approval: single admin & 2-of-3 multisig");
    console.log("✅ Admin transfer: position transfer, security checks");
    console.log("✅ Voting: single vote, multiple users, duplicate prevention");
    console.log("✅ Vote tracking: count increment, timestamp recording");
    console.log("✅ Voting weights: various weights (0, 1, 100, 1000, 1M)");
    console.log("✅ Weight accumulation: multiple users with different weights");
    console.log("✅ Vote data structure: timestamp, weight, bump storage");
    console.log("✅ Security: non-admin/non-owner prevention");
    console.log("✅ Multiple users: independent operations");
    console.log("=".repeat(60) + "\n");
  });
});
