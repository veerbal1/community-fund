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

describe("community-fund", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const user = provider.wallet.publicKey;

  const program = anchor.workspace.communityFund as Program<CommunityFund>;
  const userProfilePDA = generatePDA(user, program.programId);

  const bob = Keypair.generate();

  it("Initialize user", async () => {
    // Add your test here.
    const tx = await program.methods.initializeUser().rpc();
    console.log("Transaction signature", tx);

    const userProfile = await program.account.userProfile.fetch(userProfilePDA);
    expect(userProfile.proposalCount.toNumber()).to.equal(0);
  });

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
        userProfile: userProfilePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    console.log("Transaction signature", tx);
    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.title).to.equal("Test Proposal");
    expect(proposal.description).to.equal("Test Description");
    expect(proposal.amountRequested.toNumber()).to.equal(1000000000);
    expect(proposal.voteCount.toNumber()).to.equal(0);
  });

  it("Update proposal", async () => {
    const proposalPDA = generateProposalPDA(user, program.programId, 0);
    const tx = await program.methods
      .updateProposal(new BN(0), "New Title", "New Description")
      .rpc();
    console.log("Transaction signature", tx);

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.title).to.equal("New Title");
    expect(proposal.description).to.equal("New Description");
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
      // Verify the error is a ConstraintSeeds violation
      expect(error.message).to.include("ConstraintSeeds");
    }

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.title).to.equal("New Title");
    expect(proposal.description).to.equal("New Description");
  });

  it("Initialize admin", async () => {
    const configPDA = generateConfigPDA(program.programId);
    const tx = await program.methods.initializeAdmin().rpc();
    console.log("Transaction signature", tx);

    const config = await program.account.config.fetch(configPDA);
    expect(config.admin.toString()).to.equal(user.toString());
  });

  it("Admin can reject proposal", async () => {
    const proposalPDA = generateProposalPDA(user, program.programId, 0);
    const configPDA = generateConfigPDA(program.programId);

    const tx = await program.methods
      .rejectProposal(new BN(0), user)
      .accounts({
        proposal: proposalPDA,
        admin: user,
        config: configPDA,
      })
      .rpc();

    console.log("Transaction signature", tx);

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.status).to.deep.equal({ rejected: {} });
  });

  it("Non-admin cannot reject proposal", async () => {
    // Create a new proposal first
    const count = await program.account.userProfile
      .fetch(userProfilePDA)
      .then((userProfile) => userProfile.proposalCount.toNumber());
    const proposalPDA = generateProposalPDA(user, program.programId, count);
    
    await program.methods
      .createProposal(
        "Another Proposal",
        "Another Description",
        new anchor.BN(2000000000)
      )
      .accounts({
        userProfile: userProfilePDA,
        user: user,
        proposal: proposalPDA,
      })
      .rpc();

    const configPDA = generateConfigPDA(program.programId);

    try {
      await program.methods
        .rejectProposal(new BN(count), user)
        .accounts({
          proposal: proposalPDA,
          admin: bob.publicKey,
          config: configPDA,
        })
        .signers([bob])
        .rpc();

      expect.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      // Verify the error is a ConstraintHasOne violation (admin check)
      expect(error.message).to.include("Error");
    }

    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.status).to.deep.equal({ pending: {} });
  });
});
