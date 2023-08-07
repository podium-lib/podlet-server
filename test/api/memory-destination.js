const MemoryDestination = {

  logs: [],

  // called by pino
  write(chunk) {
    this.logs.push(chunk)
  },

  reset() {
    const current = this.logs
    this.logs = []
    return current
  }
}
export default MemoryDestination