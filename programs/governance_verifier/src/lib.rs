use anchor_lang::prelude::*;
use solana_program::clock::UnixTimestamp;

mod state;
mod instructions;

pub use crate::state::*;
pub use crate::instructions::*;

declare_id!("ATCsJvzSbHaJj3a9uKTRHSoD8ZmWPfeC3sYxzcJJHTM5");

#[program]
pub mod governance_verifier {
    use super::*;

    /// This function configures what the parameters will be for the verifier.
    /// The verifier knowing which governance and what proposal to verify.
    pub fn configure(ctx: Context<Configure>, amount_per_voter: u64, eligibility_start: UnixTimestamp, eligibility_end: UnixTimestamp) -> Result<()> {
        handle_configure(ctx, amount_per_voter, eligibility_start, eligibility_end)
    }
}
