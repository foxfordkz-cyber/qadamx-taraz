class APIError(Exception):
    def __init__(self, status: int, code: str, message: str, fields=None, *, retry_after=None):
        self.status = status
        self.code = code
        self.message = message
        self.fields = fields or {}
        self.retry_after = retry_after
        super().__init__(code)
