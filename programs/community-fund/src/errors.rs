use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the program's upgrade authority can perform this action")]
    Unauthorized,

    #[msg("Invalid program data account provided")]
    InvalidProgramData,

    #[msg("Failed to extract upgrade authority from program data")]
    InvalidUpgradeAuthority,

    #[msg("This admin has already approved this proposal")]
    AlreadyApproved,

    #[msg("Voting Expired")]
    VotingExpired,

    #[msg("Voting period is still active")]
    VotingStillActive,

    #[msg("Proposal has not received enough votes")]
    InsufficientVotes,

    #[msg("Proposal already finalized")]
    AlreadyFinalized,

    #[msg("Proposal not approved for claiming")]
    NotApproved,

    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
}
