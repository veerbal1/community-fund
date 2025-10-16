use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admins: [Pubkey; 3],
    pub bump: u8,
}

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

    #[max_len(3)]
    pub funding_approvals: Vec<Pubkey>,
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

#[account]
#[derive(InitSpace)]
pub struct VoteAccount {
    pub timestamp: i64,
    pub token_weight: u64,
    pub bump: u8,
}
