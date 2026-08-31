class CredentialRotationReminders {
  constructor() {
    this.credentials = [];
    this.reminders = [];
  }

  register(name, expiresAt, owner, severity = 'medium') {
    this.credentials.push({
      name,
      expiresAt: new Date(expiresAt).toISOString(),
      owner,
      severity,
      registeredAt: new Date().toISOString()
    });
  }

  checkDue(withinDays = 30) {
    const now = Date.now();
    const windowMs = withinDays * 24 * 60 * 60 * 1000;
    return this.credentials
      .map(c => ({ ...c, expiresDate: new Date(c.expiresAt).getTime() }))
      .filter(c => c.expiresDate - now <= windowMs)
      .sort((a, b) => a.expiresDate - b.expiresDate);
  }

  addReminder(name, message, dueAt) {
    this.reminders.push({
      name,
      message,
      dueAt: new Date(dueAt).toISOString(),
      createdAt: new Date().toISOString()
    });
  }

  getStats() {
    const now = Date.now();
    const due = this.checkDue(30);
    return {
      totalCredentials: this.credentials.length,
      dueWithin30Days: due.length,
      reminders: this.reminders.length
    };
  }
}

module.exports = { CredentialRotationReminders };
