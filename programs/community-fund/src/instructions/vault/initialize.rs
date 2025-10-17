use anchor_lang::prelude::*;
use crate::state::Vault;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        seeds = [b"vault"],
        bump,
        payer = admin,
        space = 8 + Vault::INIT_SPACE
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.total_deposited = 0;
    vault.total_claimed = 0;
    vault.bump = ctx.bumps.vault;

    msg!("Vault initialized successfully");
    Ok(())
}
