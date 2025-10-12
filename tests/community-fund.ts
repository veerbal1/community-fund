import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CommunityFund } from "../target/types/community_fund";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";

const generatePDA = (key: PublicKey, programId: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), key.toBuffer()],
    programId
  )[0];
};

const generateProposalPDA = (user: PublicKey, programId: PublicKey, count: number) => {
  const countBuffer = Buffer.alloc(8);
  countBuffer.writeBigUInt64BE(BigInt(count + 1));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("proposal"), user.toBuffer(), countBuffer],
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

  it("Initialize user", async () => {
    // Add your test here.
    const tx = await program.methods.initializeUser().rpc();
    console.log("Transaction signature", tx);

    const userProfile = await program.account.userProfile.fetch(userProfilePDA);
    expect(userProfile.proposalCount.toNumber()).to.equal(0);
  });

  it("Create proposal", async () => {
    const count = await program.account.userProfile.fetch(userProfilePDA).then(userProfile => userProfile.proposalCount.toNumber());
    const proposalPDA = generateProposalPDA(user, program.programId, count);
    const tx = await program.methods
      .createProposal(
        "Test Proposal",
        "Test Description",
        new anchor.BN(1000000000)
      ).accounts({
        userProfile: userProfilePDA,
        user: user,
        proposal: proposalPDA
      })
      .rpc();

    console.log("Transaction signature", tx);
    const proposal = await program.account.proposal.fetch(proposalPDA);
    expect(proposal.title).to.equal("Test Proposal");
    expect(proposal.description).to.equal("Test Description");
    expect(proposal.amountRequested.toNumber()).to.equal(1000000000);
    expect(proposal.voteCount.toNumber()).to.equal(0);
  });
});
