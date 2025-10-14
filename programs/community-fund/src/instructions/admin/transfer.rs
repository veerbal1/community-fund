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
    old_admin: Pubkey,
    new_admin: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    // Verify current admin is calling and is in admins array
    let current_admin = ctx.accounts.current_admin.key();
    require!(
        config.admins.contains(&current_admin),
        ErrorCode::Unauthorized
    );
    
    // Find and replace the old admin with new admin in the array
    let mut admin_replaced = false;
    for i in 0..config.admins.len() {
        if config.admins[i] == old_admin {
            config.admins[i] = new_admin;
            admin_replaced = true;
            break;
        }
    }
    
    require!(admin_replaced, ErrorCode::Unauthorized);
    
    msg!("Admin transferred from {} to {}", old_admin, new_admin);
    
    Ok(())
}

