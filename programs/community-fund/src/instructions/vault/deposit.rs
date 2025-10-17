use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::Vault;

#[derive(Accounts)]
pub struct DepositToVault<'info> {
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn deposit_to_vault(
    ctx: Context<DepositToVault>,
    amount: u64,
) -> Result<()> {
    // Transfer SOL from depositor to vault PDA
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.depositor.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
    );

    system_program::transfer(cpi_context, amount)?;

    // Update vault tracking
    let vault = &mut ctx.accounts.vault;
    vault.total_deposited += amount;

    msg!("Deposited {} lamports to vault", amount);
    Ok(())
}
