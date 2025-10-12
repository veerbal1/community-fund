use anchor_lang::prelude::*;

declare_id!("6gE2epaU3z6ySCsnwY9fvWyCCTnUMZ97c4jkzvPg52St");

#[account]
pub struct Proposal {
    pub id: u64,
    pub owner: Pubkey,
    pub title: String,
    pub description: String,
    pub amount_requested: u64,
    pub status: ProposalStatus,
    pub created_at: i64,
    pub vote_count: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
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
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init, seeds=[b"user_profile", user.key().as_ref()], bump, payer = user , space = 8 + UserProfile::INIT_SPACE)]
    pub user_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}
