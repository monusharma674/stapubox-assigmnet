import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Header } from "../src/components/Header"
import { Sidebar } from "../src/components/Sidebar"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false }
  }
})

describe("Header and Navigation", () => {
  it("renders header with search bar and status", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )
    expect(screen.getByPlaceholderText(/Search sports trivia/i)).toBeDefined()
    expect(screen.getByText(/AI Status/i)).toBeDefined()
  })

  it("renders sidebar with all navigation links", () => {
    render(
      <MemoryRouter>
        <Sidebar collapsed={false} setCollapsed={() => {}} />
      </MemoryRouter>
    )
    expect(screen.getByText("SportSpark AI")).toBeDefined()
    expect(screen.getByText("Generate")).toBeDefined()
    expect(screen.getByText("History")).toBeDefined()
    expect(screen.getByText("Saved")).toBeDefined()
    expect(screen.getByText("Knowledge Sources")).toBeDefined()
    expect(screen.getByText("Analytics")).toBeDefined()
    expect(screen.getByText("Settings")).toBeDefined()
  })
})
