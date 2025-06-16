import React, { useState } from 'react'

const CommandSection = () => {
  const [command, setCommand] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (command.trim()) {
      console.log('Executing command:', command)
      // TODO: Implement command execution
      setCommand('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <div className="command-section">
      <form onSubmit={handleSubmit} className="command-prompt">
        <span className="prompt-symbol">flamebot@workflow:~$</span>
        <input
          type="text"
          className="command-input"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="type 'help' for commands or use UI tabs above"
          autoComplete="off"
          spellCheck="false"
        />
        <span className="cursor"></span>
      </form>
    </div>
  )
}

export default CommandSection