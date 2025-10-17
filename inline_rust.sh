#!/bin/bash

# Simple script to inline Rust modules into a single file
# Generates: combined_source.rs

OUTPUT_FILE="combined_source.rs"

cd programs/community-fund/src

{
echo "// Combined Rust source - all modules inlined"
echo "// Generated for LLM sharing - macros NOT expanded"
echo ""

# Start with lib.rs
cat lib.rs | sed 's/^mod /\/\/ mod /g'

echo ""
echo "// ===== errors.rs ====="
cat errors.rs

echo ""
echo "// ===== state.rs ====="
cat state.rs

echo ""
echo "// ===== instructions/mod.rs ====="
cat instructions/mod.rs | sed 's/^pub mod /\/\/ pub mod /g'

echo ""
echo "// ===== instructions/admin/mod.rs ====="
cat instructions/admin/mod.rs | sed 's/^pub mod /\/\/ pub mod /g'

echo ""
echo "// ===== instructions/admin/initialize.rs ====="
cat instructions/admin/initialize.rs

echo ""
echo "// ===== instructions/admin/transfer.rs ====="
cat instructions/admin/transfer.rs

echo ""
echo "// ===== instructions/proposal/mod.rs ====="
cat instructions/proposal/mod.rs | sed 's/^pub mod /\/\/ pub mod /g'

echo ""
echo "// ===== instructions/proposal/create.rs ====="
cat instructions/proposal/create.rs

echo ""
echo "// ===== instructions/proposal/initialize_user.rs ====="
cat instructions/proposal/initialize_user.rs

echo ""
echo "// ===== instructions/proposal/reject.rs ====="
cat instructions/proposal/reject.rs

echo ""
echo "// ===== instructions/proposal/update.rs ====="
cat instructions/proposal/update.rs

echo ""
echo "// ===== instructions/proposal/approve_funding.rs ====="
cat instructions/proposal/approve_funding.rs

echo ""
echo "// ===== instructions/proposal/vote.rs ====="
cat instructions/proposal/vote.rs

} > "../../../$OUTPUT_FILE"

cd ../../..
echo "✅ Combined source generated: $OUTPUT_FILE"
