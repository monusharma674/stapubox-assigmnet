import { describe, expect, it } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { QuestionCard } from "../src/components/QuestionCard"

const sampleMCQ = {
  id: 1,
  batch_id: 1,
  sport: "Cricket",
  difficulty: "Easy",
  era: "Historical",
  type: "mcq" as const,
  prompt: "Which country won the 1983 Cricket World Cup?",
  correct_answer: "B",
  explanation: "India defeated West Indies in the final at Lord's.",
  opinion_based: false,
  confidence_score: 0.95,
  quality_score: 0.9,
  fact_check_status: "verified",
  semantic_duplicate_score: 0,
  saved: false,
  created_at: "2026-08-26T12:00:00Z",
  options: [
    { label: "A", text: "West Indies" },
    { label: "B", text: "India" },
    { label: "C", text: "Australia" },
    { label: "D", text: "England" }
  ],
  sources: [
    {
      title: "ICC Records",
      url: "https://icc-cricket.com",
      statement: "India won the 1983 World Cup",
      retrieved_date: "2026-08-26",
      access_date: "2026-08-26"
    }
  ]
}

const samplePoll = {
  id: 2,
  batch_id: 1,
  sport: "Football",
  difficulty: "Medium",
  era: "Opinion",
  type: "poll" as const,
  prompt: "Who is the greatest footballer of the 21st century?",
  correct_answer: null,
  explanation: null,
  opinion_based: true,
  confidence_score: 0.0,
  quality_score: 0.85,
  fact_check_status: "opinion",
  semantic_duplicate_score: 0,
  saved: true,
  created_at: "2026-08-26T12:00:00Z",
  options: [
    { label: "A", text: "Lionel Messi" },
    { label: "B", text: "Cristiano Ronaldo" }
  ],
  sources: []
}

describe("QuestionCard", () => {
  it("does not reveal answer before interaction when creatorMode is false", () => {
    render(<QuestionCard creatorMode={false} q={sampleMCQ} />)
    expect(screen.queryByText(/India defeated West Indies/i)).toBeNull()
    expect(screen.getByText("Which country won the 1983 Cricket World Cup?")).toBeDefined()
    expect(screen.getByText("West Indies")).toBeDefined()
    expect(screen.getByText("India")).toBeDefined()
  })

  it("reveals answer and explanation when creatorMode is true", () => {
    render(<QuestionCard creatorMode={true} q={sampleMCQ} />)
    expect(screen.getByText(/India defeated West Indies in the final at Lord's/i)).toBeDefined()
    expect(screen.getByText(/Correct: B/i)).toBeDefined()
  })

  it("displays opinion poll indicator for polls", () => {
    render(<QuestionCard creatorMode={false} q={samplePoll} />)
    expect(screen.getByText(/Opinion Poll/i)).toBeDefined()
    expect(screen.getByText(/No Correct Answer/i)).toBeDefined()
  })

  it("opens sources modal when clicking sources button", () => {
    render(<QuestionCard creatorMode={false} q={sampleMCQ} />)
    const srcBtn = screen.getByTitle("View Grounding Sources")
    fireEvent.click(srcBtn)
    expect(screen.getByText("Grounding Sources & Verification")).toBeDefined()
    expect(screen.getByText("ICC Records")).toBeDefined()
  })
})
