use anchor_lang::prelude::*;

declare_id!("6gE2epaU3z6ySCsnwY9fvWyCCTnUMZ97c4jkzvPg52St");

#[program]
pub mod community_fund {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
