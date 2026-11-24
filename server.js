const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// ========================================
// DATABASE
// ========================================

const databasePath = path.join(__dirname, "database.json");

function readDatabase() {
    if (!fs.existsSync(databasePath)) {
        const initialData = {
            books: [],
            borrowings: [],
            exchanges: []
        };

        fs.writeFileSync(
            databasePath,
            JSON.stringify(initialData, null, 4)
        );

        return initialData;
    }

    const db = JSON.parse(
        fs.readFileSync(databasePath, "utf8")
    );

    db.books = Array.isArray(db.books) ? db.books : [];
    db.borrowings = Array.isArray(db.borrowings) ? db.borrowings : [];
    db.exchanges = Array.isArray(db.exchanges) ? db.exchanges : [];

    return db;
}

function saveDatabase(db) {
    fs.writeFileSync(
        databasePath,
        JSON.stringify(db, null, 4)
    );
}

// ========================================
// GENERATE UNIQUE ID
// Format: 2 Letters + 3 Numbers
// Example: AB123
// ========================================

function generateId(records) {
    let id;

    do {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";

        const first = letters[Math.floor(Math.random() * 26)];
        const second = letters[Math.floor(Math.random() * 26)];

        let digits = "";

        for (let i = 0; i < 3; i++) {
            digits += numbers[Math.floor(Math.random() * 10)];
        }

        id = first + second + digits;

    } while (records.some(record => record.id === id));

    return id;
}

// ========================================
// HOME PAGE
// ========================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

app.get("/api", (req, res) => {
    res.json({
        message: "Digital Public Library Backend is running!"
    });
});

// ========================================
// 1. ADD BOOK
// ========================================

app.post("/api/books", (req, res) => {
    const { title, author, category, donor } = req.body;

    if (!title || !author || !category || !donor) {
        return res.status(400).json({
            message: "Please provide all book details"
        });
    }

    const db = readDatabase();

    const book = {
        id: generateId(db.books),
        title,
        author,
        category,
        donor,
        status: "Available",
        createdAt: new Date().toISOString()
    };

    db.books.push(book);

    saveDatabase(db);

    res.status(201).json({
        message: "Book added successfully",
        book
    });
});

// ========================================
// 2. DISPLAY BOOKS
// ========================================

app.get("/api/books", (req, res) => {
    const db = readDatabase();

    res.json(db.books);
});

// ========================================
// 3. SEARCH BOOKS
// ========================================

app.get("/api/books/search", (req, res) => {
    const db = readDatabase();

    const search = (req.query.title || "").toLowerCase();

    const books = db.books.filter(book =>
        book.title.toLowerCase().includes(search)
    );

    res.json(books);
});

// ========================================
// 4. BORROW BOOK
// ========================================

app.post("/api/books/:id/borrow", (req, res) => {
    const { borrowerName } = req.body;

    if (!borrowerName) {
        return res.status(400).json({
            message: "Borrower name is required"
        });
    }

    const db = readDatabase();

    const book = db.books.find(
        item => item.id === req.params.id
    );

    if (!book) {
        return res.status(404).json({
            message: "Book not found"
        });
    }

    if (book.status !== "Available") {
        return res.status(400).json({
            message: "Book is not available"
        });
    }

    const borrowing = {
        id: generateId(db.borrowings),
        bookId: book.id,
        borrowerName,
        status: "Borrowed",
        borrowedAt: new Date().toISOString()
    };

    book.status = "Borrowed";

    db.borrowings.push(borrowing);

    saveDatabase(db);

    res.status(201).json({
        message: "Book borrowed successfully",
        borrowing
    });
});

// ========================================
// 5. DISPLAY BORROWINGS
// ========================================

app.get("/api/borrowings", (req, res) => {
    const db = readDatabase();

    res.json(db.borrowings);
});

// ========================================
// 6. RETURN BOOK
// ========================================

app.post("/api/borrowings/:id/return", (req, res) => {
    const db = readDatabase();

    const borrowing = db.borrowings.find(
        item => item.id === req.params.id
    );

    if (!borrowing) {
        return res.status(404).json({
            message: "Borrowing record not found"
        });
    }

    if (borrowing.status === "Returned") {
        return res.status(400).json({
            message: "Book has already been returned"
        });
    }

    const book = db.books.find(
        item => item.id === borrowing.bookId
    );

    if (book) {
        book.status = "Available";
    }

    borrowing.status = "Returned";
    borrowing.returnedAt = new Date().toISOString();

    saveDatabase(db);

    res.json({
        message: "Book returned successfully",
        borrowing
    });
});

// ========================================
// 7. REQUEST BOOK EXCHANGE
// ========================================

app.post("/api/exchanges", (req, res) => {
    const {
        requesterName,
        offeredBookId,
        requestedBookId
    } = req.body;

    if (!requesterName || !offeredBookId || !requestedBookId) {
        return res.status(400).json({
            message: "Please provide all exchange details"
        });
    }

    const db = readDatabase();

    const offeredBook = db.books.find(
        item => item.id === offeredBookId
    );

    const requestedBook = db.books.find(
        item => item.id === requestedBookId
    );

    if (!offeredBook || !requestedBook) {
        return res.status(404).json({
            message: "One or both books were not found"
        });
    }

    if (offeredBookId === requestedBookId) {
        return res.status(400).json({
            message: "You cannot exchange a book with itself"
        });
    }

    if (
        offeredBook.status !== "Available" ||
        requestedBook.status !== "Available"
    ) {
        return res.status(400).json({
            message: "Both books must be available for exchange"
        });
    }

    const exchange = {
        id: generateId(db.exchanges),
        requesterName,
        offeredBookId,
        requestedBookId,
        status: "Pending",
        createdAt: new Date().toISOString()
    };

    db.exchanges.push(exchange);

    saveDatabase(db);

    res.status(201).json({
        message: "Exchange request submitted successfully",
        exchange
    });
});

// ========================================
// 8. DISPLAY EXCHANGE REQUESTS
// ========================================

app.get("/api/exchanges", (req, res) => {
    const db = readDatabase();

    // Convert old lowercase statuses to standard format.
    db.exchanges.forEach(exchange => {
        const currentStatus = String(
            exchange.status || "Pending"
        ).toLowerCase();

        if (currentStatus === "pending") {
            exchange.status = "Pending";
        } else if (currentStatus === "approved") {
            exchange.status = "Approved";
        } else if (currentStatus === "rejected") {
            exchange.status = "Rejected";
        }
    });

    saveDatabase(db);

    res.json(db.exchanges);
});

// ========================================
// 9. UPDATE EXCHANGE STATUS
// ADMINISTRATOR CONTROL
// ========================================

app.patch("/api/exchanges/:id/status", (req, res) => {

    const { status } = req.body;

    const allowedStatuses = [
        "Pending",
        "Approved",
        "Rejected"
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            message: "Invalid exchange status"
        });
    }

    const db = readDatabase();

    const exchange = db.exchanges.find(
        item => item.id === req.params.id
    );

    if (!exchange) {
        return res.status(404).json({
            message: "Exchange request not found"
        });
    }

    const oldStatus = exchange.status || "Pending";

    exchange.status = status;

    exchange.updatedAt = new Date().toISOString();

    saveDatabase(db);

    res.json({
        message: `Exchange status changed from ${oldStatus} to ${status}`,
        exchange
    });
});

// ========================================
// 10. DELETE BOOK
// ========================================

app.delete("/api/books/:id", (req, res) => {
    const db = readDatabase();

    const bookIndex = db.books.findIndex(
        item => item.id === req.params.id
    );

    if (bookIndex === -1) {
        return res.status(404).json({
            message: "Book not found"
        });
    }

    const book = db.books[bookIndex];

    if (book.status === "Borrowed") {
        return res.status(400).json({
            message: "Cannot delete a borrowed book"
        });
    }

    const hasPendingExchange = db.exchanges.some(exchange =>
        (
            exchange.offeredBookId === book.id ||
            exchange.requestedBookId === book.id
        ) &&
        exchange.status === "Pending"
    );

    if (hasPendingExchange) {
        return res.status(400).json({
            message: "Cannot delete a book with a pending exchange request"
        });
    }

    db.books.splice(bookIndex, 1);

    saveDatabase(db);

    res.json({
        message: "Book deleted successfully"
    });
});

// ========================================
// 11. DASHBOARD
// ========================================

app.get("/api/dashboard", (req, res) => {
    const db = readDatabase();

    const totalBooks = db.books.length;

    const availableBooks = db.books.filter(
        book => book.status === "Available"
    ).length;

    const borrowedBooks = db.books.filter(
        book => book.status === "Borrowed"
    ).length;

    const totalBorrowings = db.borrowings.length;

    const totalExchanges = db.exchanges.length;

    const pendingExchanges = db.exchanges.filter(
        exchange => exchange.status === "Pending" ||
            exchange.status === "pending"
    ).length;

    res.json({
        totalBooks,
        availableBooks,
        borrowedBooks,
        totalBorrowings,
        totalExchanges,
        pendingExchanges
    });
});

// ========================================
// ERROR HANDLING
// ========================================

app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        message: "Internal server error"
    });
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
