"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/sidebar";
import {
  Dice5,
  Coins,
  BarChart3,
  RefreshCw,
  Play,
} from "lucide-react";

type CoinRun = {
  flips: number;
  heads: number;
  tails: number;
  proportion: number;
};

type DiceRun = {
  rolls: number;
  counts: number[];
};

type SampleSizeResult = {
  n: number;
  heads: number;
  proportion: number;
};

export default function SimulationsPage() {
  const [coinFlips, setCoinFlips] = useState(100);
  const [coinRun, setCoinRun] = useState<CoinRun | null>(null);

  const [diceRolls, setDiceRolls] = useState(100);
  const [diceRun, setDiceRun] = useState<DiceRun | null>(null);

  const [sampleResults, setSampleResults] = useState<SampleSizeResult[]>([]);

  function runCoinSimulation() {
    if (coinFlips < 1 || coinFlips > 100000) return;

    let heads = 0;

    for (let i = 0; i < coinFlips; i++) {
      if (Math.random() < 0.5) {
        heads++;
      }
    }

    const tails = coinFlips - heads;

    setCoinRun({
      flips: coinFlips,
      heads,
      tails,
      proportion: heads / coinFlips,
    });
  }

  function runDiceSimulation() {
    if (diceRolls < 1 || diceRolls > 100000) return;

    const counts = [0, 0, 0, 0, 0, 0];

    for (let i = 0; i < diceRolls; i++) {
      const roll = Math.floor(Math.random() * 6);

      counts[roll]++;
    }

    setDiceRun({
      rolls: diceRolls,
      counts,
    });
  }

  function runSampleSizeComparison() {
    const sizes = [10, 100, 1000, 10000];

    const results = sizes.map((n) => {
      let heads = 0;

      for (let i = 0; i < n; i++) {
        if (Math.random() < 0.5) {
          heads++;
        }
      }

      return {
        n,
        heads,
        proportion: heads / n,
      };
    });

    setSampleResults(results);
  }

  function resetAll() {
    setCoinRun(null);
    setDiceRun(null);
    setSampleResults([]);
  }

  const maxDiceCount = useMemo(() => {
    if (!diceRun) return 1;

    return Math.max(...diceRun.counts, 1);
  }, [diceRun]);

  return (
    <main className="flex min-h-screen bg-[#020617] text-white">
      <Sidebar />

      <section className="flex-1 p-10">
        {/* HEADER */}
        <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div>
            <div className="mb-4 flex items-center gap-4">
              <Dice5 className="h-14 w-14 text-green-400" />

              <h1 className="text-5xl font-bold">
                Simulation Arena
              </h1>
            </div>

            <p className="max-w-3xl text-lg text-slate-400">
              Explore randomness, probability, and sampling behavior through
              interactive statistical experiments.
            </p>
          </div>

          <button
            type="button"
            onClick={resetAll}
            className="flex items-center gap-3 self-start rounded-2xl border border-slate-700 bg-slate-900 px-6 py-3 font-semibold text-slate-300 transition hover:border-purple-500"
          >
            <RefreshCw className="h-5 w-5" />
            Reset Arena
          </button>
        </div>

        {/* COIN SIMULATOR */}
        <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="mb-6 flex items-center gap-4">
            <Coins className="h-10 w-10 text-yellow-400" />

            <div>
              <h2 className="text-3xl font-bold">
                Coin Flip Simulator
              </h2>

              <p className="mt-1 text-slate-400">
                Explore how experimental probability changes with sample size.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-3 block text-lg text-slate-300">
              Number of flips
            </label>

            <input
              type="number"
              min="1"
              max="100000"
              value={coinFlips}
              onChange={(event) =>
                setCoinFlips(Number(event.target.value))
              }
              className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 p-4 text-xl text-white outline-none focus:border-purple-500"
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            {[10, 100, 1000, 10000].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCoinFlips(value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-300 transition hover:border-cyan-500"
              >
                {value.toLocaleString()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={runCoinSimulation}
            className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105"
          >
            <Play className="h-5 w-5" />
            Run Coin Simulation
          </button>

          {coinRun && (
            <div className="mt-8 grid gap-5 md:grid-cols-4">
              <ResultCard
                label="Flips"
                value={coinRun.flips.toLocaleString()}
              />

              <ResultCard
                label="Heads"
                value={coinRun.heads.toLocaleString()}
              />

              <ResultCard
                label="Tails"
                value={coinRun.tails.toLocaleString()}
              />

              <ResultCard
                label="Proportion Heads"
                value={coinRun.proportion.toFixed(4)}
              />
            </div>
          )}

          {coinRun && (
            <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-5">
              <p className="text-slate-300">
                Distance from theoretical probability 0.5:
                <span className="ml-2 font-bold text-cyan-400">
                  {Math.abs(coinRun.proportion - 0.5).toFixed(4)}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* DICE SIMULATOR */}
        <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="mb-6 flex items-center gap-4">
            <Dice5 className="h-10 w-10 text-purple-400" />

            <div>
              <h2 className="text-3xl font-bold">
                Dice Roll Simulator
              </h2>

              <p className="mt-1 text-slate-400">
                Compare empirical frequencies with the expected uniform distribution.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-3 block text-lg text-slate-300">
              Number of rolls
            </label>

            <input
              type="number"
              min="1"
              max="100000"
              value={diceRolls}
              onChange={(event) =>
                setDiceRolls(Number(event.target.value))
              }
              className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 p-4 text-xl text-white outline-none focus:border-purple-500"
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            {[10, 60, 600, 6000].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDiceRolls(value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-300 transition hover:border-purple-500"
              >
                {value.toLocaleString()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={runDiceSimulation}
            className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105"
          >
            <Play className="h-5 w-5" />
            Roll Dice
          </button>

          {diceRun && (
            <div className="mt-8">
              <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                {diceRun.counts.map((count, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-center"
                  >
                    <p className="text-sm text-slate-400">
                      Face {index + 1}
                    </p>

                    <p className="mt-2 text-3xl font-bold text-purple-400">
                      {count}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {(count / diceRun.rolls).toFixed(3)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {diceRun.counts.map((count, index) => {
                  const width =
                    maxDiceCount > 0
                      ? (count / maxDiceCount) * 100
                      : 0;

                  return (
                    <div key={index}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-slate-300">
                          Face {index + 1}
                        </span>

                        <span className="text-slate-400">
                          {(count / diceRun.rolls).toFixed(3)}
                        </span>
                      </div>

                      <div className="h-4 overflow-hidden rounded-full bg-slate-950">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                          style={{
                            width: `${width}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SAMPLE SIZE COMPARISON */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="mb-6 flex items-center gap-4">
            <BarChart3 className="h-10 w-10 text-cyan-400" />

            <div>
              <h2 className="text-3xl font-bold">
                Sample Size Comparison
              </h2>

              <p className="mt-1 text-slate-400">
                Compare several experiments side by side.
              </p>
            </div>
          </div>

          <p className="mb-6 max-w-3xl text-lg leading-relaxed text-slate-300">
            Run fair-coin experiments with sample sizes 10, 100, 1,000,
            and 10,000. Compare how close the observed proportion of heads is
            to the theoretical value 0.5.
          </p>

          <button
            type="button"
            onClick={runSampleSizeComparison}
            className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 px-7 py-4 font-semibold transition hover:scale-105"
          >
            <Play className="h-5 w-5" />
            Compare Sample Sizes
          </button>

          {sampleResults.length > 0 && (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="px-4 py-4">
                      Sample Size
                    </th>

                    <th className="px-4 py-4">
                      Heads
                    </th>

                    <th className="px-4 py-4">
                      Proportion Heads
                    </th>

                    <th className="px-4 py-4">
                      Distance from 0.5
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sampleResults.map((result) => (
                    <tr
                      key={result.n}
                      className="border-b border-slate-800"
                    >
                      <td className="px-4 py-4 font-semibold">
                        {result.n.toLocaleString()}
                      </td>

                      <td className="px-4 py-4">
                        {result.heads.toLocaleString()}
                      </td>

                      <td className="px-4 py-4 font-semibold text-cyan-400">
                        {result.proportion.toFixed(4)}
                      </td>

                      <td className="px-4 py-4 text-yellow-400">
                        {Math.abs(
                          result.proportion - 0.5
                        ).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

type ResultCardProps = {
  label: string;
  value: string;
};

function ResultCard({
  label,
  value,
}: ResultCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}