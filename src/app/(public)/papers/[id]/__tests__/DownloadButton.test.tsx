// src/app/(public)/papers/[id]/__tests__/DownloadButton.test.tsx
//
// Tests for DownloadButton: loading state, success (window.open), and error
// states (non-ok response, server error message, network failure).

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DownloadButton } from '../DownloadButton'

// DownloadButton calls window.open — stub it.
const openSpy = vi.fn()

beforeEach(() => {
  vi.stubGlobal('open', openSpy)
  openSpy.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DownloadButton', () => {
  it('renders the download button', () => {
    render(<DownloadButton paperId="abc" />)
    expect(
      screen.getByRole('button', { name: /download this past paper/i }),
    ).toBeInTheDocument()
  })

  it('shows loading text while fetch is in flight', async () => {
    // Return a promise that never resolves so we can inspect loading state.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )

    render(<DownloadButton paperId="abc" />)
    const btn = screen.getByRole('button', { name: /download this past paper/i })
    fireEvent.click(btn)

    expect(await screen.findByText(/preparing download/i)).toBeInTheDocument()
    expect(btn).toBeDisabled()
  })

  it('calls window.open with the signed URL on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ url: 'https://example.com/file.pdf' }),
        }),
      ),
    )

    render(<DownloadButton paperId="abc" />)
    fireEvent.click(screen.getByRole('button', { name: /download this past paper/i }))

    await waitFor(() => expect(openSpy).toHaveBeenCalledTimes(1))
    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/file.pdf',
      '_blank',
      'noopener,noreferrer',
    )
    // Button should no longer show loading text.
    expect(screen.getByText(/download paper/i)).toBeInTheDocument()
  })

  it('displays the server error message on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({ error: 'Too many requests. Please try again later.' }),
        }),
      ),
    )

    render(<DownloadButton paperId="abc" />)
    fireEvent.click(screen.getByRole('button', { name: /download this past paper/i }))

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Too many requests. Please try again later.')
  })

  it('falls back to generic error message when server returns no error field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        }),
      ),
    )

    render(<DownloadButton paperId="abc" />)
    fireEvent.click(screen.getByRole('button', { name: /download this past paper/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /download failed\. please try again/i,
    )
  })

  it('shows a network-error message on fetch rejection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error'))),
    )

    render(<DownloadButton paperId="abc" />)
    fireEvent.click(screen.getByRole('button', { name: /download this past paper/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /download failed\. please check your connection/i,
    )
  })

  it('re-enables the button after an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error'))),
    )

    render(<DownloadButton paperId="abc" />)
    const btn = screen.getByRole('button', { name: /download this past paper/i })
    fireEvent.click(btn)

    await screen.findByRole('alert')
    expect(btn).not.toBeDisabled()
  })
})
