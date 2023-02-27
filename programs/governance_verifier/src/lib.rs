use anchor_lang::prelude::*;

mod instructions;
mod state;

pub use crate::instructions::*;
pub use crate::state::*;

declare_id!("ATCsJvzSbHaJj3a9uKTRHSoD8ZmWPfeC3sYxzcJJHTM5");

#[program]
pub mod governance_verifier {
    use super::*;

    /// This function configures what the parameters will be for the verifier.
    /// The verifier knowing which governance and what proposal to verify.
    pub fn configure(
        ctx: Context<Configure>,
        seed: [u8; 64],
        amount_per_voter: u64,
        eligibility_start: i64,
        eligibility_end: i64,
    ) -> Result<()> {
        handle_configure(
            ctx,
            seed,
            amount_per_voter,
            eligibility_start,
            eligibility_end,
        )
    }

    /// The verifier knowing which governance and what proposal to verify.
    pub fn verify(ctx: Context<Verify>, amount: u64, verification_data: Vec<u8>) -> Result<()> {
        handle_verify(ctx, amount, verification_data)
    }
}
