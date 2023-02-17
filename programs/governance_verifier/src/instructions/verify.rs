use crate::*;

use anchor_spl::token::TokenAccount;
use more_asserts::{assert_ge, assert_le};
use solana_program::pubkey::Pubkey;
use spl_governance::state::governance::{get_governance_data, GovernanceV2};
use spl_governance::state::proposal::{get_proposal_data_for_governance, ProposalV2};
use spl_governance::state::token_owner_record::get_token_owner_record_address;
use spl_governance::state::vote_record::{
    get_vote_record_address, get_vote_record_data, VoteRecordV2,
};
use std::str::FromStr;

#[derive(Accounts)]
#[instruction(amount: u64, _verification_data: Vec<u8>)]
pub struct Verify<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Verifier state includes the eligibility period and the governance needed to verify.
    pub verifier_state: Account<'info, VerifierState>,

    /// Recipient owner will be matched against the VoteRecordV2
    pub recipient: Account<'info, TokenAccount>,

    /// CHECK: GovernanceV2 is not an anchor account so it has to be checked in the handler
    pub governance: UncheckedAccount<'info>,

    /// CHECK: ProposalV2 is not an anchor account so it has to be checked in the handler
    pub proposal: UncheckedAccount<'info>,

    /// CHECK: VoteRecordV2 is not an anchor account so it has to be checked in the handler
    pub vote_record: UncheckedAccount<'info>,

    #[account(
        init,
        seeds = ["Receipt".as_ref(), verifier_state.key().as_ref(), vote_record.key().as_ref()],
        bump,
        space = 8 + std::mem::size_of::<Receipt>(),
        payer = authority
    )]
    pub receipt: Account<'info, Receipt>,

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

    let vote_record: VoteRecordV2 =
        get_vote_record_data(&gov_key, &ctx.accounts.vote_record.to_account_info())?;

    // Check that the voting started during the eligibility period.
    assert_ge!(
        proposal.voting_at.unwrap(),
        ctx.accounts.verifier_state.eligibility_start
    );
    assert_le!(
        proposal.voting_at.unwrap(),
        ctx.accounts.verifier_state.eligibility_end
    );

    // Verify that the vote record corresponds to the proposal which corresponds to the governance.
    assert_eq!(vote_record.proposal, ctx.accounts.proposal.key());
    assert_eq!(proposal.governance, ctx.accounts.verifier_state.governance);

    // Verify that the vote_record corresponds to the recipient owner.
    assert_eq!(
        vote_record.governing_token_owner,
        ctx.accounts.recipient.owner
    );

    // Verify the address. Cannot use anchor verification because the seeds are
    // stored on objects that are not anchor objects. It is sufficient to just
    // check the VoteRecordV2 because we can rely on the governance program to
    // not allow creating a VoteRecordV2 on an invalid proposal and the
    // VoteRecordV2 has the proposal address on it. When we deserialized the
    // proposal, it verified the program here:
    // https://github.com/solana-labs/solana-program-library/blob/ea891fe0df9fd60239de9d8006daab17f58e039b/governance/program/src/state/proposal.rs#L957

    assert_eq!(
        ctx.accounts.verifier_state.governance,
        ctx.accounts.governance.key()
    );
    let governance_data: GovernanceV2 =
        get_governance_data(&gov_key, &ctx.accounts.governance.to_account_info())?;
    let token_owner_record_address: Pubkey = get_token_owner_record_address(
        &gov_key,
        &governance_data.realm,
        &proposal.governing_token_mint,
        &vote_record.governing_token_owner.key(),
    );

    let expected_vote_record_address: Pubkey = get_vote_record_address(
        &gov_key,
        &ctx.accounts.proposal.key(),
        &token_owner_record_address,
    );

    // This makes sure that the vote record provided is a real vote record and
    // not just a faked account.
    assert_eq!(ctx.accounts.vote_record.key(), expected_vote_record_address);

    ctx.accounts.receipt.state = ctx.accounts.verifier_state.key();
    ctx.accounts.receipt.vote_record = ctx.accounts.vote_record.key();

    Ok(())
}
