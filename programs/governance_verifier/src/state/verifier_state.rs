use anchor_lang::prelude::*;

// Necessary fields for doing a verification. The requirement for proof will be
// any VoteRecordV2 and corresponding Proposal that match the governance and the
// proposal was within the eligibility period.
#[account]
pub struct VerifierState {
    // The governance from
    // https://github.com/solana-labs/solana-program-library/blob/master/governance/program/src/state/governance.rs#L80
    // which is used for this verifier.
    pub governance: Pubkey,

    // The verifier will check that the given Proposal is in the eligibility
    // period. Uses i64 instead of UnixTimestamp alias so anchor idl can parse.
    // https://github.com/coral-xyz/anchor/issues/1632
    pub eligibility_start: i64,
    pub eligibility_end: i64,

    // Amount of tokens to give to each eligible recipient.
    pub amount_per_voter: u64,

    // Airdrop that this verifier is assigned to and will use as a seed for
    // signing in the claim.
    pub airdrop_state: Pubkey,

    // Left available for future updates.
    pub unused_padding: [u8; 128],
}
