use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the program's upgrade authority can perform this action")]
    Unauthorized,
    
    #[msg("Invalid program data account provided")]
    InvalidProgramData,
    
    #[msg("Failed to extract upgrade authority from program data")]
    InvalidUpgradeAuthority,
}

