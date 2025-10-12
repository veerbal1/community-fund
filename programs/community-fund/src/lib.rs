use anchor_lang::prelude::*;

declare_id!("6gE2epaU3z6ySCsnwY9fvWyCCTnUMZ97c4jkzvPg52St");

#[account]
#[derive(InitSpace)]
pub struct Proposal {
    pub id: u64,
    pub owner: Pubkey,
    #[max_len(50)]
    pub title: String,
    #[max_len(200)]
    pub description: String,
    pub amount_requested: u64,
    pub status: ProposalStatus,
    pub created_at: i64,
    pub vote_count: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ProposalStatus {
    Pending,
    Approved,
    Rejected,
}

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub proposal_count: u64,
    pub bump: u8,
}

#[program]
pub mod community_fund {
    use super::*;

    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.proposal_count = 0;
        user_profile.bump = ctx.bumps.user_profile;
        Ok(())
    }

    pub fn create_proposal(ctx: Context<CreateProposal>, title: String, description: String, amount_requested: u64) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        proposal.id = ctx.accounts.user_profile.proposal_count + 1;
        proposal.owner = *ctx.accounts.user.key;
        proposal.title = title;
        proposal.description = description;
        proposal.amount_requested = amount_requested;
        proposal.status = ProposalStatus::Pending;
        proposal.vote_count = 0;
        proposal.bump = ctx.bumps.proposal;
        proposal.created_at = Clock::get()?.unix_timestamp;

        ctx.accounts.user_profile.proposal_count += 1;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init, seeds=[b"user_profile", user.key().as_ref()], bump, payer = user , space = 8 + UserProfile::INIT_SPACE)]
    pub user_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub user_profile: Account<'info, UserProfile>,

    #[account(init, seeds=[b"proposal", user.key().as_ref(), ((user_profile.proposal_count + 1).to_be_bytes().as_ref())], bump, payer = user, space = 8 + Proposal::INIT_SPACE)]
    pub proposal: Account<'info, Proposal>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}
