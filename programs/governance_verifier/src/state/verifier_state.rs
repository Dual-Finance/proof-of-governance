use anchor_lang::prelude::*;
use solana_program::clock::UnixTimestamp;

/// Necessary fields for doing a verification. The requirement for proof will be
/// any VoteRecordV2 and corresponding Proposal that match the governance and
/// the proposal was within the eligibility period.
#[account]
pub struct VerifierState {
    /// The governance from
    /// https://github.com/solana-labs/solana-program-library/blob/master/governance/program/src/state/governance.rs#L80
    /// which is used for this verifier.
    pub governance: Pubkey,

    /// The verifier will check that the given Proposal is in the eligibility period.
    pub eligibility_start: UnixTimestamp,
    pub eligibility_end: UnixTimestamp,

    /// Amount of tokens to give to each eligible recipient.
    pub amount_per_voter: u64,
}
