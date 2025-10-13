use anchor_lang::prelude::*;
use anchor_lang::solana_program::bpf_loader_upgradeable;
use crate::state::Config;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct InitializeAdmin<'info> {
    /// Config account - stores admin info
    #[account(
        init,
        seeds = [b"config"],
        bump,
        payer = user,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,

    /// User who is trying to initialize (must be upgrade authority)
    #[account(mut)]
    pub user: Signer<'info>,

    /// Program data account - contains upgrade authority
    /// CHECK: We manually verify this is the correct program data account
    pub program_data: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_admin(ctx: Context<InitializeAdmin>) -> Result<()> {
    // Step 1: Derive expected program_data address from this executing program
    let program_id = ctx.program_id;
    let (expected_program_data, _bump) = Pubkey::find_program_address(
        &[program_id.as_ref()],
        &bpf_loader_upgradeable::id()
    );
    
    // Step 2: Verify passed program_data matches expected
    require!(
        ctx.accounts.program_data.key() == expected_program_data,
        ErrorCode::InvalidProgramData
    );
    
    // Step 3: Extract upgrade authority from program_data
    let program_data = ctx.accounts.program_data.try_borrow_data()?;
    
    // Program data structure:
    // Bytes 0-3: Account type
    // Bytes 4-12: Slot
    // Bytes 13-45: Upgrade Authority (32 bytes pubkey)
    // Bytes 46+: Executable code
    
    require!(
        program_data.len() >= 45,
        ErrorCode::InvalidUpgradeAuthority
    );
    
    let upgrade_authority_bytes = &program_data[13..45];
    let upgrade_authority = Pubkey::new_from_array(
        upgrade_authority_bytes
            .try_into()
            .map_err(|_| ErrorCode::InvalidUpgradeAuthority)?
    );
    
    // Step 4: Verify caller is the upgrade authority
    require!(
        ctx.accounts.user.key() == upgrade_authority,
        ErrorCode::Unauthorized
    );
    
    // Step 5: Set admin
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.user.key();
    config.bump = ctx.bumps.config;
    
    msg!("Admin initialized: {}", config.admin);
    
    Ok(())
}

