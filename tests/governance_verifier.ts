import * as anchor from '@coral-xyz/anchor';
import { Program, Provider } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import assert from 'assert';
import { GovernanceVerifier } from '../target/types/governance_verifier';
import { createMint, createTokenAccount } from './utils/utils';

const crypto = require('crypto');

describe('anchor_verifier', () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider: Provider = anchor.AnchorProvider.env();
  const program = anchor.workspace
    .GovernanceVerifier as Program<GovernanceVerifier>;
  const amount = new anchor.BN(1_000_000);
  const eligibilityStart = new anchor.BN(0);
  const eligibilityEnd = new anchor.BN(2_000_000_000);

  const proposal = new PublicKey(
    '6ws4bv5CefMwVXi54fMc6c7VU1RrT3QxYYeGzQMiVp4Z',
  );
  const voteRecord = new PublicKey(
    'BsGL7UwBT9ojUTMgtYh6foZrbWVnJvBBpsprdjkswVA1',
  );
  const governance = new PublicKey(
    'Dg31swH4qLRzqgFsDZb3eME1QvwgAXnzA1Awtwgh3oc4',
  );
  const recipient = new PublicKey(
    '2qLWeNrV7QkHQvKBoEvXrKeLqEB2ZhscZd4ds7X2JUhn',
  );

  let mint: PublicKey;
  let recipientTokenAccount: PublicKey;

  it('Governance Verify', async () => {
    const seed = crypto.randomBytes(32);
    const [verifierState, _verifierStateBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [seed],
        program.programId,
      ));

    const configureTx = await program.methods
      .configure(seed, amount, eligibilityStart, eligibilityEnd)
      .accounts({
        payer: provider.publicKey,
        state: verifierState,
        governance,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    console.log('Configure signature', configureTx);

    mint = await createMint(provider, provider.publicKey);

    // Do not actually need to mint to the account because that is handled in the airdropper.
    recipientTokenAccount = await createTokenAccount(provider, mint, recipient);

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        verifierState.toBuffer(),
        voteRecord.toBuffer(),
      ],
      program.programId,
    );
    try {
      const verifyTx = await program.methods
        .verify(amount, Buffer.alloc(0))
        .accounts({
          authority: provider.publicKey,
          verifierState,
          recipient: recipientTokenAccount,
          governance,
          proposal,
          voteRecord,
          receipt,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });
      console.log('Verification signature', verifyTx);
    } catch (err) {
      console.log(err);
      assert(false);
    }
  });

  it('Fail not in time range', async () => {
    const seed = crypto.randomBytes(32);
    const [verifierState, _verifierStateBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [seed],
        program.programId,
      ));

    const configureTx = await program.methods
      .configure(seed, amount, eligibilityStart, eligibilityStart)
      .accounts({
        payer: provider.publicKey,
        state: verifierState,
        governance,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    console.log('Configure signature', configureTx);

    try {
      const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
          verifierState.toBuffer(),
          voteRecord.toBuffer(),
        ],
        program.programId,
      );
      const verifyTx = await program.methods
        .verify(amount, Buffer.alloc(0))
        .accounts({
          authority: provider.publicKey,
          verifierState,
          recipient: recipientTokenAccount,
          governance,
          proposal,
          voteRecord,
          receipt,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });
      console.log('Verification signature', verifyTx);
      assert(false);
    } catch (err) {
      assert(true);
    }
  });

  it('Fail not wrong voter', async () => {
    const seed = crypto.randomBytes(32);
    const [verifierState, _verifierStateBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [seed],
        program.programId,
      ));

    const configureTx = await program.methods
      .configure(seed, amount, eligibilityStart, eligibilityEnd)
      .accounts({
        payer: provider.publicKey,
        state: verifierState,
        governance,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    console.log('Configure signature', configureTx);

    const wrongRecipientTokenAccount = await createTokenAccount(
      provider,
      mint,
      recipient,
    );
    try {
      const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
          verifierState.toBuffer(),
          voteRecord.toBuffer(),
        ],
        program.programId,
      );
      const verifyTx = await program.methods
        .verify(amount, Buffer.alloc(0))
        .accounts({
          authority: provider.publicKey,
          verifierState,
          recipient: wrongRecipientTokenAccount,
          governance,
          proposal,
          voteRecord,
          receipt,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });
      console.log('Verification signature', verifyTx);
      assert(false);
    } catch (err) {
      assert(true);
    }
  });

  it('Fail wrong amount', async () => {
    const seed = crypto.randomBytes(32);
    const [verifierState, _verifierStateBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [seed],
        program.programId,
      ));

    const configureTx = await program.methods
      .configure(seed, amount, eligibilityStart, eligibilityEnd)
      .accounts({
        payer: provider.publicKey,
        state: verifierState,
        governance,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    console.log('Configure signature', configureTx);

    try {
      const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
          verifierState.toBuffer(),
          voteRecord.toBuffer(),
        ],
        program.programId,
      );
      const verifyTx = await program.methods
        .verify(new anchor.BN(1), Buffer.alloc(0))
        .accounts({
          authority: provider.publicKey,
          verifierState,
          recipient: recipientTokenAccount,
          governance,
          proposal,
          voteRecord,
          receipt,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });
      console.log('Verification signature', verifyTx);
      assert(false);
    } catch (err) {
      assert(true);
    }
  });

  it('Fail wrong governance', async () => {
    const seed = crypto.randomBytes(32);
    const [verifierState, _verifierStateBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [seed],
        program.programId,
      ));

    const configureTx = await program.methods
      .configure(seed, amount, eligibilityStart, eligibilityEnd)
      .accounts({
        payer: provider.publicKey,
        state: verifierState,
        governance,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    console.log('Configure signature', configureTx);

    try {
      const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
          verifierState.toBuffer(),
          voteRecord.toBuffer(),
        ],
        program.programId,
      );
      const verifyTx = await program.methods
        .verify(new anchor.BN(1), Buffer.alloc(0))
        .accounts({
          authority: provider.publicKey,
          verifierState,
          recipient: recipientTokenAccount,
          governance: proposal,
          proposal,
          voteRecord,
          receipt,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });
      console.log('Verification signature', verifyTx);
      assert(false);
    } catch (err) {
      assert(true);
    }
  });
});
