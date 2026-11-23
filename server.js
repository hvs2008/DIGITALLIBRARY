
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

// PORT DECLARATION (ONLY ONCE)
const PORT = process.env.PORT || 3000;

// MIDDLEWARE
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// DATABASE
const DB_FILE = path.join(__dirname, "database.json");

// INITIALIZE DATABASE
function initializeDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        saveDatabase({
            books: [],
            borrowings: [],
            exchanges: []
        });
    }
}

// READ DATABASE
function readDatabase() {
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

    if (
        !Array.isArray(data.books) ||
        !Array.isArray(data.borrowings) ||
        !Array.isArray(data.exchanges)
    ) {
        throw new Error("Invalid database structure.");
    }

    return data;
}

// SAVE DATABASE
function saveDatabase(data) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(data, null, 2)
    );
}

// GENERATE UNIQUE 5-CHARACTER ID
// 2 ALPHABETS + 3 NUMBERS
function generateId(records) {
    let id;

    do {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        const first = letters[crypto.randomInt(26)];
        const second = letters[crypto.randomInt(26)];

        let digits = "";

        for (let i = 0; i < 3; i++) {
            digits += crypto.randomInt(10);
        }

        id = first + second + digits;

    } while (records.some(record => record.id === id));

    return id;
}

// CREATE DATABASE IF NOT EXISTS
initializeDatabase();


// HOME PAGE
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});


// API STATUS
app.get("/api", (req, res) => {
    res.json({
        message: "Digital Public Library Backend is running!"
    });
});


// 1. ADD BOOK
app.post("/api/books", (req, res) => {

    const { title, author, category, donor } = req.body;

    if (
        typeof title !== "string" ||
        typeof author !== "string" ||
        !title.trim() ||
        !author.trim()
    ) {
        return res.status(400).json({
            message: "Book title and author are required."
        });
    }

    const db = readDatabase();

    const book = {
        id: generateId(db.books),
        title: title.trim(),
        author: author.trim(),
        category: typeof category === "string" && category.trim()
            ? category.trim()
            : "General",
        donor: typeof donor === "string" && donor.trim()
            ? donor.trim()
            : "Library",
        status: "available",
        createdAt: new Date().toISOString()
    };

    db.books.push(book);

    saveDatabase(db);

    res.status(201).json({
        message: "Book added successfully!",
        book
    });
});


// 2. DISPLAY ALL BOOKS
app.get("/api/books", (req, res) => {

    const db = readDatabase();

    res.json(db.books);
});


// 3. SEARCH BOOKS
app.get("/api/books/search", (req, res) => {

    const { title, author } = req.query;

    const db = readDatabase();

    const results = db.books.filter(book => {

        const titleMatch = !title ||
            book.title.toLowerCase().includes(title.toLowerCase());

        const authorMatch = !author ||
            book.author.toLowerCase().includes(author.toLowerCase());

        return titleMatch && authorMatch;
    });

    res.json(results);
});


// 4. BORROW BOOK
app.post("/api/books/:id/borrow", (req, res) => {

    const borrowerName =
        typeof req.body.borrowerName === "string"
            ? req.body.borrowerName.trim()
            : "";

    if (!borrowerName) {
        return res.status(400).json({
            message: "Borrower name is required."
        });
    }

    const db = readDatabase();

    const book = db.books.find(
        b => b.id === req.params.id
    );

    if (!book) {
        return res.status(404).json({
            message: "Book not found."
        });
    }

    if (book.status !== "available") {
        return res.status(400).json({
            message: "Book is not available."
        });
    }

    const borrowing = {
        id: generateId(db.borrowings),
        bookId: book.id,
        borrowerName,
        borrowDate: new Date().toISOString(),
        returnDate: null,
        status: "borrowed"
    };

    book.status = "borrowed";

    db.borrowings.push(borrowing);

    saveDatabase(db);

    res.json({
        message: "Book borrowed successfully!",
        borrowing
    });
});


// 5. RETURN BOOK
app.post("/api/borrowings/:id/return", (req, res) => {

    const db = readDatabase();

    const borrowing = db.borrowings.find(
        b => b.id === req.params.id
    );

    if (!borrowing || borrowing.status !== "borrowed") {
        return res.status(404).json({
            message: "Active borrowing record not found."
        });
    }

    const book = db.books.find(
        b => b.id === borrowing.bookId
    );

    if (!book) {
        return res.status(404).json({
            message: "Book record not found."
        });
    }

    borrowing.status = "returned";

    borrowing.returnDate = new Date().toISOString();

    book.status = "available";

    saveDatabase(db);

    res.json({
        message: "Book returned successfully!"
    });
});


// 6. VIEW BORROWING RECORDS
app.get("/api/borrowings", (req, res) => {

    const db = readDatabase();

    res.json(db.borrowings);
});


// 7. REQUEST BOOK EXCHANGE
app.post("/api/exchanges", (req, res) => {

    const requesterName =
        typeof req.body.requesterName === "string"
            ? req.body.requesterName.trim()
            : "";

    const offeredBookId =
        typeof req.body.offeredBookId === "string"
            ? req.body.offeredBookId.trim()
            : "";

    const requestedBookId =
        typeof req.body.requestedBookId === "string"
            ? req.body.requestedBookId.trim()
            : "";

    if (
        !requesterName ||
        !offeredBookId ||
        !requestedBookId
    ) {
        return res.status(400).json({
            message: "All exchange details are required."
        });
    }

    if (offeredBookId === requestedBookId) {
        return res.status(400).json({
            message: "Choose two different books."
        });
    }

    const db = readDatabase();

    const offeredBook = db.books.find(
        b => b.id === offeredBookId
    );

    const requestedBook = db.books.find(
        b => b.id === requestedBookId
    );

    if (!offeredBook || !requestedBook) {
        return res.status(404).json({
            message: "One or both books were not found."
        });
    }

    if (
        offeredBook.status !== "available" ||
        requestedBook.status !== "available"
    ) {
        return res.status(400).json({
            message: "Both books must be available."
        });
    }

    const exchange = {
        id: generateId(db.exchanges),
        requesterName,
        offeredBookId,
        requestedBookId,
        status: "pending",
        createdAt: new Date().toISOString()
    };

    db.exchanges.push(exchange);

    saveDatabase(db);

    res.status(201).json({
        message: "Exchange request submitted!",
        exchange
    });
});


// 8. VIEW EXCHANGE REQUESTS
app.get("/api/exchanges", (req, res) => {

    const db = readDatabase();

    res.json(db.exchanges);
});


// 9. DELETE BOOK
app.delete("/api/books/:id", (req, res) => {

    const db = readDatabase();

    const book = db.books.find(
        b => b.id === req.params.id
    );

    if (!book) {
        return res.status(404).json({
            message: "Book not found."
        });
    }

    if (book.status !== "available") {
        return res.status(400).json({
            message: "Cannot delete a borrowed book."
        });
    }

    const hasPendingExchange = db.exchanges.some(
        e =>
            e.status === "pending" &&
            (
                e.offeredBookId === book.id ||
                e.requestedBookId === book.id
            )
    );

    if (hasPendingExchange) {
        return res.status(400).json({
            message: "Book has a pending exchange request."
        });
    }

    db.books = db.books.filter(
        b => b.id !== req.params.id
    );

    saveDatabase(db);

    res.json({
        message: "Book deleted successfully!"
    });
});


// 10. DASHBOARD STATISTICS
app.get("/api/dashboard", (req, res) => {

    const db = readDatabase();

    res.json({

        totalBooks: db.books.length,

        availableBooks: db.books.filter(
            b => b.status === "available"
        ).length,

        borrowedBooks: db.books.filter(
            b => b.status === "borrowed"
        ).length,

        totalBorrowings: db.borrowings.length,

        totalExchanges: db.exchanges.length,

        pendingExchanges: db.exchanges.filter(
            e => e.status === "pending"
        ).length

    });
});


// UNKNOWN API ROUTES
app.use("/api", (req, res) => {

    res.status(404).json({
        message: "API endpoint not found."
    });

});


// ERROR HANDLER
app.use((err, req, res, next) => {

    console.error("Server error:", err);

    if (res.headersSent) {
        return next(err);
    }

    const status = err.status || err.statusCode || 500;

    res.status(status).json({
        message: status === 400
            ? "Invalid request data."
            : "Server error. Check the VS Code terminal."
    });

});


// START SERVER
// PORT IS ALREADY DECLARED AT THE TOP
app.listen(PORT, "0.0.0.0", () => {

    console.log(`Server running on port ${PORT}`);

});
