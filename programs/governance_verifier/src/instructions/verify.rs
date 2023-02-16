use crate::*;

use std::str::FromStr;
use anchor_spl::token::TokenAccount;
use spl_governance::state::proposal::{get_proposal_data_for_governance, ProposalV2};
use spl_governance::state::vote_record::{get_vote_record_data, get_vote_record_address, VoteRecordV2};
use solana_program::pubkey::Pubkey;
use more_asserts::{assert_le, assert_ge};

#[derive(Accounts)]
#[instruction(amount: u64, _verification_data: Vec<u8>)]
pub struct Verify<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Verifier state includes the eligibility period and the governance needed to verify.
    pub verifier_state: Account<'info, VerifierState>,

    /// Recipient owner will be matched against the VoteRecordV2
    pub recipient: Account<'info, TokenAccount>,

    /// CHECK: ProposalV2 is not an anchor account so it has to be checked in the handler
    pub proposal: UncheckedAccount<'info>,

    /// CHECK: VoteRecordV2 is not an anchor account so it has to be checked in the handler
    pub vote_record: UncheckedAccount<'info>,

    // TODO: Include a receipt so the same VoteRecordV2 cannot be reused.
    pub system_program: Program<'info, System>,
}

pub fn handle_verify(ctx: Context<Verify>, amount: u64, _verification_data: Vec<u8>) -> Result<()> {
    let gov_key: Pubkey = Pubkey::from_str("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw").unwrap();

    // Verify the amount requested is correct.
    assert_eq!(amount, ctx.accounts.verifier_state.amount_per_voter);

    let proposal: ProposalV2 = get_proposal_data_for_governance(
        &gov_key,
        &ctx.accounts.proposal.to_account_info(),
        &ctx.accounts.verifier_state.governance,
    )?;

    let vote_record: VoteRecordV2 = get_vote_record_data(
        &gov_key,
        &ctx.accounts.vote_record.to_account_info(),
    )?;

    // Check that the voting started during the eligibility period.
    assert_ge!(proposal.voting_at.unwrap(), ctx.accounts.verifier_state.eligibility_start);
    assert_le!(proposal.voting_at.unwrap(), ctx.accounts.verifier_state.eligibility_end);

    // Verify that the vote record corresponds to the proposal which corresponds to the governance.
    assert_eq!(vote_record.proposal, ctx.accounts.proposal.key());
    assert_eq!(proposal.governance, ctx.accounts.verifier_state.governance);

    // Verify that the vote_record corresponds to the recipient owner.
    assert_eq!(vote_record.governing_token_owner, ctx.accounts.recipient.owner);

    // Verify the address. Cannot use anchor verification because the seeds are
    // stored on objects that are not anchor objects. It is sufficient to just
    // check the VoteRecordV2 because we can rely on the governance program to
    // not allow creating a VoteRecordV2 on an invalid proposal and the
    // VoteRecordV2 has the proposal address on it. When we deserialized the
    // proposal, it verified the program.
    // https://github.com/solana-labs/solana-program-library/blob/ea891fe0df9fd60239de9d8006daab17f58e039b/governance/program/src/state/proposal.rs#L957
    let expected_vote_record_address = get_vote_record_address(
        &gov_key,
        &ctx.accounts.proposal.key(),
        &vote_record.governing_token_owner.key(),
    );

    assert_eq!(ctx.accounts.vote_record.key(), expected_vote_record_address);
    
    Ok(())
}
