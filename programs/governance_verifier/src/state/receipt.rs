use anchor_lang::prelude::*;

#[account]
pub struct Receipt {
    pub vote_record: Pubkey,
    pub state: Pubkey,
}
