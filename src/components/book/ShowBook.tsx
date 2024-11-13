import React from 'react'
import './ShowBook.scss'

export function ShowBook({ book }: any) {
  if (book == null)
    return (<></>)
  return (
    <div className="book-container">
      <div className="book-title">
        {book.title}
      </div>
      <div className="book-description">
        {book.summary}
      </div>
    </div>
  )
}
