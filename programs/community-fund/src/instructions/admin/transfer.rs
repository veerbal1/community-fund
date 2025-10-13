use anchor_lang::prelude::*;
use crate::state::Config;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct TransferAdmin<'info> {
    /// Config account
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    /// Current admin (must sign)
    #[account(mut)]
    pub current_admin: Signer<'info>,
}

pub fn transfer_admin(
    ctx: Context<TransferAdmin>,
    new_admin: Pubkey
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    // Verify current admin is calling
    require!(
        ctx.accounts.current_admin.key() == config.admin,
        ErrorCode::Unauthorized
    );
    
    // Update admin
    let old_admin = config.admin;
    config.admin = new_admin;
    
    msg!("Admin transferred from {} to {}", old_admin, new_admin);
    
    Ok(())
}

