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
});
