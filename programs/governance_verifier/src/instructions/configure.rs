use crate::*;

#[derive(Accounts)]
#[instruction(amount_per_voter: u64, eligibility_start: i64, eligibility_end: i64)]
pub struct Configure<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        space = 8 + std::mem::size_of::<VerifierState>(),
        payer = payer
    )]
    pub state: Account<'info, VerifierState>,

    /// CHECK: Not an anchor account, so cannot be verified.
    pub governance: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_configure(ctx: Context<Configure>, amount_per_voter: u64, eligibility_start: i64, eligibility_end: i64) -> Result<()> {
    ctx.accounts.state.eligibility_start = eligibility_start;
    ctx.accounts.state.eligibility_end = eligibility_end;
    ctx.accounts.state.governance = ctx.accounts.governance.key();
    ctx.accounts.state.amount_per_voter = amount_per_voter;

    Ok(())
}