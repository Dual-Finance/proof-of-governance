import * as anchor from '@coral-xyz/anchor';
import { Idl, Program, Provider } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@project-serum/serum/lib/token-instructions';
import { PublicKey } from '@solana/web3.js';
import assert from 'assert';
import { GovernanceVerifier } from '../target/types/governance_verifier';
import { DualAirdrop } from './utils/dual_airdrop_type';
import dualAirdropIdl from './utils/dual_airdrop.json';
import { createMint, createTokenAccount, mintToAccount } from './utils/utils';

const crypto = require('crypto');

describe('governance_verifier', () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const DUAL_AIRDROP_PK: PublicKey = new PublicKey('2fJcpdR6qzqDP7fBqvoJQ5PGYdaRFBNyUKZkZf5t12mr');

  const provider: Provider = anchor.AnchorProvider.env();
  const airdropProgram = new Program(
    dualAirdropIdl as Idl,
    DUAL_AIRDROP_PK,
    provider,
  ) as Program<DualAirdrop>;
  const governanceVerifier = anchor.workspace
    .GovernanceVerifier as Program<GovernanceVerifier>;
  const amount = new anchor.BN(1_000_000);
  const eligibilityStart = new anchor.BN(0);
  const eligibilityEnd = new anchor.BN(2_000_000_000);
  const airdropAmount = new anchor.BN(1_000_000);

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

  it('Governance Verify', async () => {
    const governanceAirdropSeed = crypto.randomBytes(32);
    const [governanceAirdropState, _stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [governanceAirdropSeed],
      airdropProgram.programId,
    );
    const [governanceAirdropVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
        governanceAirdropState.toBuffer(),
      ],
      airdropProgram.programId,
    );
    const [verifierSignature, _signatureBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [governanceAirdropState.toBuffer()],
      governanceVerifier.programId,
    );

    const governanceVerifierSeed = crypto.randomBytes(32);
    const [verifierState, _verifierStateBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [governanceVerifierSeed],
        governanceVerifier.programId,
      ));

    await governanceVerifier.methods
      .configure(governanceVerifierSeed, amount, eligibilityStart, eligibilityEnd)
      .accounts({
        payer: provider.publicKey,
        state: verifierState,
        airdropState: governanceAirdropState,
        governance,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    const mint = await createMint(provider, provider.publicKey);

    await airdropProgram.methods.configure(
      governanceAirdropSeed,
    )
      .accounts({
        payer: provider.publicKey,
        state: governanceAirdropState,
        vault: governanceAirdropVault,
        mint,
        verifierSignature,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: true });

    const recipientTokenAccount = await createTokenAccount(provider, mint, recipient);
    await mintToAccount(provider, mint, governanceAirdropVault, airdropAmount, provider.publicKey);

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        verifierState.toBuffer(),
        voteRecord.toBuffer(),
      ],
      governanceVerifier.programId,
    );
    try {
      await governanceVerifier.methods
        .claim(amount)
        .accounts({
          authority: provider.publicKey,
          verifierState,
          recipient: recipientTokenAccount,
          governance,
          proposal,
          voteRecord,
          receipt,
          cpiAuthority: verifierSignature,
          airdropState: governanceAirdropState,
          vault: governanceAirdropVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          airdropProgram: airdropProgram.programId,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });
    } catch (err) {
      console.log(err);
      assert(false);
    }
  });

  it('Fail not in time range', async () => {
    const governanceAirdropSeed = crypto.randomBytes(32);
    const [governanceAirdropState, _stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [governanceAirdropSeed],
      airdropProgram.programId,
    );
    const [governanceAirdropVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
        governanceAirdropState.toBuffer(),
      ],
      airdropProgram.programId,
    );
    const [verifierSignature, _signatureBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [governanceAirdropState.toBuffer()],
      governanceVerifier.programId,
    );

    const governanceVerifierSeed = crypto.randomBytes(32);
    const [verifierState, _verifierStateBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [governanceVerifierSeed],
        governanceVerifier.programId,
      ));

    await governanceVerifier.methods
      .configure(governanceVerifierSeed, amount, eligibilityStart, new anchor.BN(1))
      .accounts({
        payer: provider.publicKey,
        state: verifierState,
        airdropState: governanceAirdropState,
        governance,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    const mint = await createMint(provider, provider.publicKey);

    await airdropProgram.methods.configure(
      governanceAirdropSeed,
    )
      .accounts({
        payer: provider.publicKey,
        state: governanceAirdropState,
        vault: governanceAirdropVault,
        mint,
        verifierSignature,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: true });

    const recipientTokenAccount = await createTokenAccount(provider, mint, recipient);
    await mintToAccount(provider, mint, governanceAirdropVault, airdropAmount, provider.publicKey);

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        verifierState.toBuffer(),
        voteRecord.toBuffer(),
      ],
      governanceVerifier.programId,
    );
    try {
      await governanceVerifier.methods
        .claim(amount)
        .accounts({
          authority: provider.publicKey,
          verifierState,
          recipient: recipientTokenAccount,
          governance,
          proposal,
          voteRecord,
          receipt,
          cpiAuthority: verifierSignature,
          airdropState: governanceAirdropState,
          vault: governanceAirdropVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          airdropProgram: airdropProgram.programId,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });
      assert(false);
    } catch (err) {
      assert(true);
    }
  });

  it('Fail wrong voter', async () => {
    const governanceAirdropSeed = crypto.randomBytes(32);
    const [governanceAirdropState, _stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [governanceAirdropSeed],
      airdropProgram.programId,
    );
    const [governanceAirdropVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
        governanceAirdropState.toBuffer(),
      ],
      airdropProgram.programId,
    );
    const [verifierSignature, _signatureBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [governanceAirdropState.toBuffer()],
      governanceVerifier.programId,
    );

    const governanceVerifierSeed = crypto.randomBytes(32);
    const [verifierState, _verifierStateBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [governanceVerifierSeed],
        governanceVerifier.programId,
      ));

    await governanceVerifier.methods
      .configure(governanceVerifierSeed, amount, eligibilityStart, eligibilityEnd)
      .accounts({
        payer: provider.publicKey,
        state: verifierState,
        airdropState: governanceAirdropState,
        governance,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    const mint = await createMint(provider, provider.publicKey);

    await airdropProgram.methods.configure(
      governanceAirdropSeed,
    )
      .accounts({
        payer: provider.publicKey,
        state: governanceAirdropState,
        vault: governanceAirdropVault,
        mint,
        verifierSignature,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: true });

    const recipientTokenAccount = await createTokenAccount(provider, mint, provider.publicKey);
    await mintToAccount(provider, mint, governanceAirdropVault, airdropAmount, provider.publicKey);

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        verifierState.toBuffer(),
        voteRecord.toBuffer(),
      ],
      governanceVerifier.programId,
    );
    try {
      await governanceVerifier.methods
        .claim(amount)
        .accounts({
          authority: provider.publicKey,
          verifierState,
          recipient: recipientTokenAccount,
          governance,
          proposal,
          voteRecord,
          receipt,
          cpiAuthority: verifierSignature,
          airdropState: governanceAirdropState,
          vault: governanceAirdropVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          airdropProgram: airdropProgram.programId,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });
      assert(false);
    } catch (err) {
      assert(true);
    }
  });

  it('Fail wrong amount', async () => {
    const governanceAirdropSeed = crypto.randomBytes(32);
    const [governanceAirdropState, _stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [governanceAirdropSeed],
      airdropProgram.programId,
    );
    const [governanceAirdropVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
        governanceAirdropState.toBuffer(),
      ],
      airdropProgram.programId,
    );
    const [verifierSignature, _signatureBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [governanceAirdropState.toBuffer()],
      governanceVerifier.programId,
    );

    const governanceVerifierSeed = crypto.randomBytes(32);
    const [verifierState, _verifierStateBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [governanceVerifierSeed],
        governanceVerifier.programId,
      ));

    await governanceVerifier.methods
      .configure(governanceVerifierSeed, amount, eligibilityStart, eligibilityEnd)
      .accounts({
        payer: provider.publicKey,
        state: verifierState,
        airdropState: governanceAirdropState,
        governance,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    const mint = await createMint(provider, provider.publicKey);

    await airdropProgram.methods.configure(
      governanceAirdropSeed,
    )
      .accounts({
        payer: provider.publicKey,
        state: governanceAirdropState,
        vault: governanceAirdropVault,
        mint,
        verifierSignature,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: true });

    const recipientTokenAccount = await createTokenAccount(provider, mint, recipient);
    await mintToAccount(provider, mint, governanceAirdropVault, airdropAmount, provider.publicKey);

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        verifierState.toBuffer(),
        voteRecord.toBuffer(),
      ],
      governanceVerifier.programId,
    );
    try {
      await governanceVerifier.methods
        .claim(new anchor.BN(123_456_789))
        .accounts({
          authority: provider.publicKey,
          verifierState,
          recipient: recipientTokenAccount,
          governance,
          proposal,
          voteRecord,
          receipt,
          cpiAuthority: verifierSignature,
          airdropState: governanceAirdropState,
          vault: governanceAirdropVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          airdropProgram: airdropProgram.programId,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });
      assert(false);
    } catch (err) {
      assert(true);
    }
  });

  it('Fail wrong governance', async () => {
    const governanceAirdropSeed = crypto.randomBytes(32);
    const [governanceAirdropState, _stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [governanceAirdropSeed],
      airdropProgram.programId,
    );
    const [governanceAirdropVault, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Vault')),
        governanceAirdropState.toBuffer(),
      ],
      airdropProgram.programId,
    );
    const [verifierSignature, _signatureBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [governanceAirdropState.toBuffer()],
      governanceVerifier.programId,
    );

    const governanceVerifierSeed = crypto.randomBytes(32);
    const [verifierState, _verifierStateBump] = (
      anchor.web3.PublicKey.findProgramAddressSync(
        [governanceVerifierSeed],
        governanceVerifier.programId,
      ));

    await governanceVerifier.methods
      .configure(governanceVerifierSeed, amount, eligibilityStart, eligibilityEnd)
      .accounts({
        payer: provider.publicKey,
        state: verifierState,
        airdropState: governanceAirdropState,
        governance,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });

    const mint = await createMint(provider, provider.publicKey);

    await airdropProgram.methods.configure(
      governanceAirdropSeed,
    )
      .accounts({
        payer: provider.publicKey,
        state: governanceAirdropState,
        vault: governanceAirdropVault,
        mint,
        verifierSignature,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc({ skipPreflight: true });

    const recipientTokenAccount = await createTokenAccount(provider, mint, recipient);
    await mintToAccount(provider, mint, governanceAirdropVault, airdropAmount, provider.publicKey);

    const [receipt, _receiptBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('Receipt')),
        verifierState.toBuffer(),
        voteRecord.toBuffer(),
      ],
      governanceVerifier.programId,
    );
    try {
      await governanceVerifier.methods
        .claim(amount)
        .accounts({
          authority: provider.publicKey,
          verifierState,
          recipient: recipientTokenAccount,
          // Will fail before account deserialization so doesnt need to be a governance.
          governance: proposal,
          proposal,
          voteRecord,
          receipt,
          cpiAuthority: verifierSignature,
          airdropState: governanceAirdropState,
          vault: governanceAirdropVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          airdropProgram: airdropProgram.programId,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });
      assert(false);
    } catch (err) {
      assert(true);
    }
  });
});
