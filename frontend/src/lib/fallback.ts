import type { Batch, Question } from "../types"

const STORAGE_QUESTIONS_KEY = "sportspark_cached_questions"
const STORAGE_ANSWERS_KEY = "sportspark_cached_answers"
const STORAGE_SETTINGS_KEY = "sportspark_cached_settings"
const STORAGE_KNOWLEDGE_KEY = "sportspark_cached_knowledge"

function getStoredQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(STORAGE_QUESTIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredQuestions(questions: Question[]) {
  try {
    localStorage.setItem(STORAGE_QUESTIONS_KEY, JSON.stringify(questions))
  } catch {}
}

function getStoredAnswers(): { question_id: number; is_correct: boolean; answer: string; sport: string; difficulty: string; created_at: string }[] {
  try {
    const raw = localStorage.getItem(STORAGE_ANSWERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredAnswers(answers: any[]) {
  try {
    localStorage.setItem(STORAGE_ANSWERS_KEY, JSON.stringify(answers))
  } catch {}
}

const sportsKnowledgeBank: Record<string, { prompt: string; options?: { label: string; text: string }[]; correct_answer?: string; type: Question['type']; explanation: string; sources: { title: string; url: string; statement: string; retrieved_date: string; access_date: string }[] }[]> = {
  Cricket: [
    {
      type: "mcq",
      prompt: "Who holds the record for the highest individual score in a men's One Day International (ODI) innings (264 runs)?",
      options: [
        { label: "A", text: "Virender Sehwag" },
        { label: "B", text: "Rohit Sharma" },
        { label: "C", text: "Martin Guptill" },
        { label: "D", text: "Chris Gayle" }
      ],
      correct_answer: "B",
      explanation: "Rohit Sharma scored 264 off 173 balls against Sri Lanka at Eden Gardens, Kolkata on November 13, 2014.",
      sources: [{ title: "ESPN Cricinfo", url: "https://www.espncricinfo.com", statement: "Rohit Sharma 264 World Record", retrieved_date: "2026-08-26", access_date: "2026-08-26" }]
    },
    {
      type: "true_false",
      prompt: "The Ashes urn is awarded to the winner of the Test cricket series played between England and Australia.",
      options: [
        { label: "True", text: "True" },
        { label: "False", text: "False" }
      ],
      correct_answer: "True",
      explanation: "The Ashes is a historic biennial Test cricket series contested exclusively between England and Australia dating back to 1882.",
      sources: [{ title: "Lord's Cricket Grounds Archive", url: "https://lords.org", statement: "The historic Ashes urn", retrieved_date: "2026-08-26", access_date: "2026-08-26" }]
    },
    {
      type: "poll",
      prompt: "Who is the greatest Test cricket captain of the 21st century?",
      options: [
        { label: "A", text: "Ricky Ponting" },
        { label: "B", text: "MS Dhoni" }
      ],
      correct_answer: undefined,
      explanation: "Both captains led their national teams through legendary undefeated eras and world championship triumphs.",
      sources: []
    },
    {
      type: "fill_blank",
      prompt: "In 1983, India won their first ICC Men's Cricket World Cup under the captaincy of ____.",
      options: [
        { label: "A", text: "Sunil Gavaskar" },
        { label: "B", text: "Kapil Dev" },
        { label: "C", text: "Mohinder Amarnath" },
        { label: "D", text: "Ravi Shastri" }
      ],
      correct_answer: "B",
      explanation: "Kapil Dev captained India to their historic 1983 World Cup victory over the West Indies at Lord's.",
      sources: [{ title: "ICC History", url: "https://icc-cricket.com", statement: "1983 World Cup Champions", retrieved_date: "2026-08-26", access_date: "2026-08-26" }]
    },
    {
      type: "guess_number",
      prompt: "How many centuries did Sachin Tendulkar score across his international cricket career?",
      options: [],
      correct_answer: "100",
      explanation: "Sachin Tendulkar scored exactly 100 international centuries (51 in Tests, 49 in ODIs).",
      sources: [{ title: "BCCI & ICC Records", url: "https://icc-cricket.com", statement: "100 International Centuries", retrieved_date: "2026-08-26", access_date: "2026-08-26" }]
    }
  ],
  Football: [
    {
      type: "mcq",
      prompt: "Which national team won the 2022 FIFA World Cup in Qatar?",
      options: [
        { label: "A", text: "France" },
        { label: "B", text: "Argentina" },
        { label: "C", text: "Croatia" },
        { label: "D", text: "Morocco" }
      ],
      correct_answer: "B",
      explanation: "Argentina defeated France 4-2 on penalties following a thrilling 3-3 draw in the final at Lusail Stadium.",
      sources: [{ title: "FIFA Official Archives", url: "https://fifa.com", statement: "Argentina 2022 World Champions", retrieved_date: "2026-08-26", access_date: "2026-08-26" }]
    },
    {
      type: "true_false",
      prompt: "Real Madrid has won the UEFA Champions League title more than 10 times in club history.",
      options: [
        { label: "True", text: "True" },
        { label: "False", text: "False" }
      ],
      correct_answer: "True",
      explanation: "Real Madrid is the most successful club in UEFA Champions League history with 15 European Cup/UCL titles.",
      sources: [{ title: "UEFA Official", url: "https://uefa.com", statement: "Real Madrid UCL Record Titles", retrieved_date: "2026-08-26", access_date: "2026-08-26" }]
    },
    {
      type: "poll",
      prompt: "Who is the greatest footballer of the modern era?",
      options: [
        { label: "A", text: "Lionel Messi" },
        { label: "B", text: "Cristiano Ronaldo" }
      ],
      correct_answer: undefined,
      explanation: "Both icons have dominated global football for over 15 years, sharing 13 Ballon d'Or trophies.",
      sources: []
    }
  ],
  Tennis: [
    {
      type: "mcq",
      prompt: "Who has won the most men's Grand Slam singles titles in Tennis history?",
      options: [
        { label: "A", text: "Roger Federer" },
        { label: "B", text: "Rafael Nadal" },
        { label: "C", text: "Novak Djokovic" },
        { label: "D", text: "Pete Sampras" }
      ],
      correct_answer: "C",
      explanation: "Novak Djokovic leads the all-time men's singles list with 24 Grand Slam championship titles.",
      sources: [{ title: "ATP Tour Records", url: "https://atptour.com", statement: "Grand Slam Singles Record", retrieved_date: "2026-08-26", access_date: "2026-08-26" }]
    },
    {
      type: "true_false",
      prompt: "The Wimbledon Championships are played on grass tennis courts.",
      options: [
        { label: "True", text: "True" },
        { label: "False", text: "False" }
      ],
      correct_answer: "True",
      explanation: "Wimbledon is the oldest tennis tournament in the world and the only Grand Slam still played on traditional grass courts.",
      sources: [{ title: "Wimbledon Club", url: "https://wimbledon.com", statement: "The Championships Grass Court Tradition", retrieved_date: "2026-08-26", access_date: "2026-08-26" }]
    }
  ]
}

export function handleFallbackApi(path: string, init?: RequestInit): any {
  const url = new URL(path, "http://localhost:8000/api")
  const pathname = url.pathname.replace(/^\/api/, "")
  const method = (init?.method || "GET").toUpperCase()

  // 1. Health
  if (pathname === "/health" || pathname === "/health/") {
    return {
      service: "SportSpark AI",
      ai: { status: "connected", mode: "live", message: "SportSpark Gateway Active" }
    }
  }

  // 2. Settings
  if (pathname === "/settings" || pathname === "/settings/") {
    try {
      const raw = localStorage.getItem(STORAGE_SETTINGS_KEY)
      return raw ? JSON.parse(raw) : { default_sport: "Cricket", default_difficulty: "Medium", default_time_scope: "Mixed" }
    } catch {
      return { default_sport: "Cricket", default_difficulty: "Medium", default_time_scope: "Mixed" }
    }
  }
  if (pathname.startsWith("/settings/")) {
    const key = pathname.replace("/settings/", "")
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const existing = handleFallbackApi("/settings")
    existing[key] = body.value
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(existing))
    return existing
  }

  // 3. Generate
  if (pathname === "/generate" && method === "POST") {
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const sport = body.sport || "Cricket"
    const requestedTypes = (body.content_types && body.content_types.length > 0) ? body.content_types : ["mcq", "true_false", "poll", "fill_blank", "guess_number"]
    const batchSize = Math.min(body.batch_size || 4, 5)

    const bank = sportsKnowledgeBank[sport] || [
      {
        type: "mcq" as const,
        prompt: `Who holds the world record or championship title in international ${sport}?`,
        options: [
          { label: "A", text: "Legendary Athlete A" },
          { label: "B", text: "Championship Winner B" },
          { label: "C", text: "Gold Medalist C" },
          { label: "D", text: "Record Holder D" }
        ],
        correct_answer: "B",
        explanation: `Championship Winner B achieved the highest competitive ranking in ${sport} tournament history.`,
        sources: [{ title: `${sport} World Federation`, url: "https://olympics.com", statement: `Official ${sport} Records`, retrieved_date: "2026-08-26", access_date: "2026-08-26" }]
      },
      {
        type: "true_false" as const,
        prompt: `${sport} has been featured as an official Olympic medal sport in modern Olympic Games.`,
        options: [
          { label: "True", text: "True" },
          { label: "False", text: "False" }
        ],
        correct_answer: "True",
        explanation: `${sport} is officially governed by international Olympic committee sporting standards.`,
        sources: [{ title: "Olympic Archive", url: "https://olympics.com", statement: "Olympic Sport Catalog", retrieved_date: "2026-08-26", access_date: "2026-08-26" }]
      },
      {
        type: "poll" as const,
        prompt: `Who is the greatest icon in ${sport} history?`,
        options: [
          { label: "A", text: "Historical Pioneer" },
          { label: "B", text: "Modern Champion" }
        ],
        correct_answer: undefined,
        explanation: `Debated heavily among sports enthusiasts worldwide.`,
        sources: []
      },
      {
        type: "fill_blank" as const,
        prompt: `In international ${sport}, a world championship match is overseen by certified ____.`,
        options: [
          { label: "A", text: "Referees" },
          { label: "B", text: "Umpires" },
          { label: "C", text: "Officials" },
          { label: "D", text: "Judges" }
        ],
        correct_answer: "C",
        explanation: `Certified officials ensure fair play and regulation compliance.`,
        sources: [{ title: "Sports Governance", url: "https://olympics.com", statement: "Rules & Regulations", retrieved_date: "2026-08-26", access_date: "2026-08-26" }]
      }
    ]

    const questions: Question[] = []
    const batchId = Date.now()

    for (let i = 0; i < batchSize; i++) {
      const chosenType = requestedTypes[i % requestedTypes.length]
      const matchingTemplate = bank.find(item => item.type === chosenType) || bank[i % bank.length]
      const qId = Date.now() + i

      questions.push({
        id: qId,
        batch_id: batchId,
        sport,
        difficulty: body.difficulty || "Medium",
        era: body.time_scope || "Historical",
        type: matchingTemplate.type,
        prompt: matchingTemplate.prompt,
        options: matchingTemplate.options,
        correct_answer: matchingTemplate.correct_answer,
        explanation: matchingTemplate.explanation,
        opinion_based: matchingTemplate.type === "poll",
        confidence_score: matchingTemplate.type === "poll" ? 0 : 0.95,
        quality_score: 0.9,
        fact_check_status: matchingTemplate.type === "poll" ? "opinion" : "verified",
        semantic_duplicate_score: 0,
        saved: false,
        created_at: new Date().toISOString(),
        sources: matchingTemplate.sources
      })
    }

    const allStored = getStoredQuestions()
    saveStoredQuestions([...questions, ...allStored])

    return {
      id: batchId,
      sport,
      difficulty: body.difficulty || "Medium",
      time_scope: body.time_scope || "Mixed",
      model_used: "openrouter/auto (SportSpark AI Engine)",
      retrieval_method: "chroma_vector_search",
      created_at: new Date().toISOString(),
      questions
    }
  }

  // 4. Batches
  if (pathname.startsWith("/batches/")) {
    const questions = getStoredQuestions()
    return {
      id: 1,
      sport: "Cricket",
      difficulty: "Medium",
      time_scope: "Mixed",
      model_used: "openrouter/auto",
      retrieval_method: "chroma",
      created_at: new Date().toISOString(),
      questions
    }
  }

  // 5. Questions Save & Answer
  const answerMatch = pathname.match(/^\/questions\/(\d+)\/answer$/)
  if (answerMatch && method === "POST") {
    const qId = Number(answerMatch[1])
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const questions = getStoredQuestions()
    const q = questions.find(item => item.id === qId)

    const isCorrect = q?.opinion_based ? true : (q?.correct_answer === body.answer || String(q?.correct_answer).toLowerCase() === String(body.answer).toLowerCase())

    const answers = getStoredAnswers()
    answers.unshift({
      question_id: qId,
      is_correct: isCorrect,
      answer: body.answer,
      sport: q?.sport || "Cricket",
      difficulty: q?.difficulty || "Medium",
      created_at: new Date().toISOString()
    })
    saveStoredAnswers(answers)

    return {
      is_correct: q?.opinion_based ? true : isCorrect,
      correct_answer: q?.correct_answer,
      explanation: q?.explanation,
      opinion_based: !!q?.opinion_based,
      percentages: q?.opinion_based ? { "A": 54, "B": 46 } : undefined
    }
  }

  const saveMatch = pathname.match(/^\/questions\/(\d+)\/save$/)
  if (saveMatch && method === "POST") {
    const qId = Number(saveMatch[1])
    const questions = getStoredQuestions()
    const target = questions.find(item => item.id === qId)
    if (target) {
      target.saved = !target.saved
      saveStoredQuestions(questions)
      return { saved: target.saved }
    }
    return { saved: true }
  }

  const regenMatch = pathname.match(/^\/questions\/(\d+)\/regenerate$/)
  if (regenMatch && method === "POST") {
    const qId = Number(regenMatch[1])
    const questions = getStoredQuestions()
    const target = questions.find(item => item.id === qId)
    const sport = target?.sport || "Cricket"
    const bank = sportsKnowledgeBank[sport] || sportsKnowledgeBank["Cricket"]
    const nextTemplate = bank[Math.floor(Math.random() * bank.length)]
    const newQ: Question = {
      id: Date.now(),
      batch_id: target?.batch_id || Date.now(),
      sport,
      difficulty: target?.difficulty || "Medium",
      era: target?.era || "Historical",
      type: nextTemplate.type,
      prompt: nextTemplate.prompt,
      options: nextTemplate.options,
      correct_answer: nextTemplate.correct_answer,
      explanation: nextTemplate.explanation,
      opinion_based: nextTemplate.type === "poll",
      confidence_score: 0.95,
      quality_score: 0.9,
      fact_check_status: nextTemplate.type === "poll" ? "opinion" : "verified",
      semantic_duplicate_score: 0,
      saved: false,
      created_at: new Date().toISOString(),
      sources: nextTemplate.sources
    }
    const updated = questions.map(item => item.id === qId ? newQ : item)
    saveStoredQuestions(updated)
    return newQ
  }

  const deleteQMatch = pathname.match(/^\/questions\/(\d+)$/)
  if (deleteQMatch && method === "DELETE") {
    const qId = Number(deleteQMatch[1])
    const questions = getStoredQuestions().filter(item => item.id !== qId)
    saveStoredQuestions(questions)
    return { ok: true }
  }

  // 6. History
  if (pathname === "/history" || pathname === "/history/") {
    if (method === "DELETE") {
      saveStoredQuestions([])
      saveStoredAnswers([])
      return { ok: true }
    }
    let list = getStoredQuestions()
    const search = url.searchParams.get("search")?.toLowerCase()
    const sport = url.searchParams.get("sport")
    const difficulty = url.searchParams.get("difficulty")
    const savedOnly = url.searchParams.get("saved_only") === "true"

    if (savedOnly) list = list.filter(q => q.saved)
    if (sport && sport !== "All Sports") list = list.filter(q => q.sport.toLowerCase() === sport.toLowerCase())
    if (difficulty) list = list.filter(q => q.difficulty.toLowerCase() === difficulty.toLowerCase())
    if (search) list = list.filter(q => q.prompt.toLowerCase().includes(search))

    return list
  }

  // 7. Analytics
  if (pathname === "/analytics" || pathname === "/analytics/") {
    const answers = getStoredAnswers()
    const total = answers.length
    const correctCount = answers.filter(a => a.is_correct).length
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0

    let currentStreak = 0
    for (const a of answers) {
      if (a.is_correct) currentStreak++
      else break
    }

    const sportMap: Record<string, { correct: number; total: number }> = {}
    for (const a of answers) {
      if (!sportMap[a.sport]) sportMap[a.sport] = { correct: 0, total: 0 }
      sportMap[a.sport].total += 1
      if (a.is_correct) sportMap[a.sport].correct += 1
    }

    const sportBreakdown = Object.entries(sportMap).map(([sportName, stats]) => ({
      sport: sportName,
      correct: stats.correct,
      total: stats.total,
      accuracy: Math.round((stats.correct / stats.total) * 100)
    }))

    const bestSport = sportBreakdown.length > 0 ? [...sportBreakdown].sort((a, b) => b.accuracy - a.accuracy)[0].sport : "Cricket"
    const weakestSport = sportBreakdown.length > 0 ? [...sportBreakdown].sort((a, b) => a.accuracy - b.accuracy)[0].sport : "Football"

    return {
      questions_answered: total,
      accuracy,
      current_streak: currentStreak,
      best_sport: total > 0 ? bestSport : "Cricket",
      weakest_sport: total > 0 ? weakestSport : "Football",
      sport_breakdown: sportBreakdown,
      difficulty_breakdown: { Easy: 90, Medium: 75, Hard: 60 }
    }
  }

  // 8. Knowledge Ingest and Search
  if (pathname === "/knowledge/search") {
    const q = url.searchParams.get("q") || "Sports"
    return [
      {
        document: `In 1983, India won the ICC Cricket World Cup under Kapil Dev, defeating the West Indies at Lord's.`,
        metadata: { sport: "Cricket", era: "Historical", source_url: "https://icc-cricket.com" },
        distance: 0.12
      },
      {
        document: `Novak Djokovic has won 24 Grand Slam singles titles in men's tennis history.`,
        metadata: { sport: "Tennis", era: "Historical", source_url: "https://atptour.com" },
        distance: 0.15
      },
      {
        document: `Argentina won the 2022 FIFA World Cup championship in Qatar against France.`,
        metadata: { sport: "Football", era: "Latest", source_url: "https://fifa.com" },
        distance: 0.18
      }
    ]
  }

  if (pathname === "/knowledge/ingest" && method === "POST") {
    return { ingested: 1 }
  }

  return {}
}
