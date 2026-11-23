
const API = "/api";

// ======================================
// 1. ADD A BOOK
// ======================================

async function addBook(event) {
    event.preventDefault();

    const title = document.getElementById("title").value.trim();
    const author = document.getElementById("author").value.trim();
    const category = document.getElementById("category").value.trim();
    const donor = document.getElementById("donor").value.trim();

    const message = document.getElementById("addMessage");

    try {
        const response = await fetch(`${API}/books`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                author,
                category,
                donor
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to add book.");
        }

        message.textContent =
            `Book added successfully! Your Book ID is ${result.book.id}`;

        message.style.color = "green";

        document.getElementById("addBookForm").reset();

        await refreshAll();

    } catch (error) {
        console.error("Add Book Error:", error);

        message.textContent = error.message;
        message.style.color = "red";
    }
}


// ======================================
// 2. DISPLAY AND SEARCH BOOKS
// ======================================

async function displayBooks() {
    try {
        const search = document.getElementById("search").value.trim();

        const response = await fetch(
            `${API}/books/search?title=${encodeURIComponent(search)}`
        );

        if (!response.ok) {
            throw new Error("Unable to fetch books.");
        }

        const books = await response.json();

        const bookList = document.getElementById("bookList");

        bookList.innerHTML = "";

        if (books.length === 0) {
            bookList.innerHTML = "<p>No books found.</p>";
            return;
        }

        books.forEach(book => {

            const div = document.createElement("div");
            div.className = "book";

            // BOOK ID
            const id = document.createElement("h3");
            id.textContent = `Book ID: ${book.id}`;
            id.style.color = "#2563eb";

            div.appendChild(id);

            // COPY ID
            const copyButton = document.createElement("button");
            copyButton.textContent = "Copy ID";

            copyButton.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(book.id);
                    alert("Book ID copied: " + book.id);
                } catch (error) {
                    alert("Unable to copy ID.");
                }
            };

            div.appendChild(copyButton);

            // BOOK DETAILS
            const details = document.createElement("p");

            details.textContent =
                `Title: ${book.title}
                 | Author: ${book.author}
                 | Category: ${book.category}
                 | Donor: ${book.donor}
                 | Status: ${book.status}`;

            div.appendChild(details);

            // BORROW OPTION
            if (book.status === "available") {

                const input = document.createElement("input");
                input.placeholder = "Enter borrower name";

                const borrowButton = document.createElement("button");
                borrowButton.textContent = "Borrow";

                borrowButton.onclick = () => {
                    borrowBook(book.id, input.value);
                };

                div.appendChild(input);
                div.appendChild(borrowButton);
            }

            bookList.appendChild(div);
        });

    } catch (error) {
        console.error("Display Books Error:", error);

        document.getElementById("bookList").textContent =
            "Unable to load books. Check server connection.";
    }
}


// ======================================
// 3. BORROW A BOOK
// ======================================

async function borrowBook(id, borrowerName) {

    if (!borrowerName.trim()) {
        alert("Please enter borrower name.");
        return;
    }

    try {
        const response = await fetch(`${API}/books/${id}/borrow`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                borrowerName: borrowerName.trim()
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        alert(
            "Book borrowed successfully!\nBorrowing ID: " +
            result.borrowing.id
        );

        await refreshAll();

    } catch (error) {
        alert(error.message || "Unable to borrow book.");
        console.error(error);
    }
}


// ======================================
// 4. DISPLAY BORROWING RECORDS
// ======================================

async function displayBorrowings() {

    try {
        const response = await fetch(`${API}/borrowings`);

        if (!response.ok) {
            throw new Error("Unable to fetch borrowing records.");
        }

        const borrowings = await response.json();

        const borrowingList =
            document.getElementById("borrowingList");

        borrowingList.innerHTML = "";

        if (borrowings.length === 0) {
            borrowingList.innerHTML =
                "<p>No borrowing records available.</p>";
            return;
        }

        borrowings.forEach(record => {

            const div = document.createElement("div");
            div.className = "record";

            const details = document.createElement("p");

            details.textContent =
                `Borrowing ID: ${record.id}
                 | Book ID: ${record.bookId}
                 | Borrower: ${record.borrowerName}
                 | Status: ${record.status}
                 | Borrow Date: ${new Date(record.borrowDate).toLocaleDateString()}`;

            div.appendChild(details);

            if (record.status === "borrowed") {
                const returnButton = document.createElement("button");

                returnButton.textContent = "Return This Book";

                returnButton.onclick = () => {
                    returnBook(record.id);
                };

                div.appendChild(returnButton);
            }

            borrowingList.appendChild(div);
        });

    } catch (error) {
        console.error("Borrowing Records Error:", error);

        document.getElementById("borrowingList").textContent =
            "Unable to load borrowing records.";
    }
}


// ======================================
// 5. RETURN A BOOK
// ======================================

async function returnBook(id) {

    if (!confirm("Are you sure you want to return this book?")) {
        return;
    }

    try {
        const response = await fetch(
            `${API}/borrowings/${id}/return`,
            {
                method: "POST"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        alert("Book returned successfully!");

        document.getElementById("returnBorrowingId").value = "";

        await refreshAll();

    } catch (error) {
        alert(error.message || "Unable to return book.");
    }
}


// ======================================
// 6. RETURN USING BORROWING ID FORM
// ======================================

async function returnBookById(event) {

    event.preventDefault();

    const id = document.getElementById("returnBorrowingId")
        .value.trim().toUpperCase();

    if (!id) {
        alert("Enter Borrowing ID.");
        return;
    }

    await returnBook(id);
}


// ======================================
// 7. REQUEST BOOK EXCHANGE
// ======================================

async function requestExchange(event) {

    event.preventDefault();

    const requesterName =
        document.getElementById("requesterName").value.trim();

    const offeredBookId =
        document.getElementById("offeredBookId").value.trim().toUpperCase();

    const requestedBookId =
        document.getElementById("requestedBookId").value.trim().toUpperCase();

    if (!/^[A-Z]{2}[0-9]{3}$/.test(offeredBookId) ||
        !/^[A-Z]{2}[0-9]{3}$/.test(requestedBookId)) {

        alert("Enter valid 5-character Book IDs (Example: AB123).");
        return;
    }

    try {
        const response = await fetch(`${API}/exchanges`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                requesterName,
                offeredBookId,
                requestedBookId
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        alert(
            "Exchange request submitted successfully!\nExchange ID: " +
            result.exchange.id
        );

        document.getElementById("exchangeForm").reset();

        await refreshAll();

    } catch (error) {
        alert(error.message || "Unable to submit exchange request.");
        console.error(error);
    }
}


// ======================================
// 8. DISPLAY EXCHANGE REQUESTS
// ======================================

async function displayExchanges() {

    try {
        const response = await fetch(`${API}/exchanges`);

        if (!response.ok) {
            throw new Error("Unable to fetch exchanges.");
        }

        const exchanges = await response.json();

        const exchangeList =
            document.getElementById("exchangeList");

        exchangeList.innerHTML = "";

        if (exchanges.length === 0) {
            exchangeList.innerHTML =
                "<p>No exchange requests available.</p>";
            return;
        }

        exchanges.forEach(exchange => {

            const div = document.createElement("div");
            div.className = "record";

            const details = document.createElement("p");

            details.textContent =
                `Exchange ID: ${exchange.id}
                 | Requester: ${exchange.requesterName}
                 | Offered Book: ${exchange.offeredBookId}
                 | Requested Book: ${exchange.requestedBookId}
                 | Status: ${exchange.status}`;

            div.appendChild(details);

            exchangeList.appendChild(div);
        });

    } catch (error) {
        console.error("Exchange Display Error:", error);

        document.getElementById("exchangeList").textContent =
            "Unable to load exchange requests.";
    }
}


// ======================================
// 9. DELETE A BOOK
// ======================================

async function deleteBook(event) {

    event.preventDefault();

    const id = document.getElementById("deleteBookId")
        .value.trim().toUpperCase();

    if (!/^[A-Z]{2}[0-9]{3}$/.test(id)) {
        alert("Enter a valid 5-character Book ID.");
        return;
    }

    if (!confirm("Are you sure you want to delete this book?")) {
        return;
    }

    try {
        const response = await fetch(`${API}/books/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        alert("Book deleted successfully!");

        document.getElementById("deleteForm").reset();

        await refreshAll();

    } catch (error) {
        alert(error.message || "Unable to delete book.");
    }
}


// ======================================
// 10. DASHBOARD STATISTICS
// ======================================

async function refreshDashboard() {

    try {
        const response = await fetch(`${API}/dashboard`);

        if (!response.ok) {
            throw new Error("Unable to load dashboard.");
        }

        const data = await response.json();

        document.getElementById("totalCount").textContent =
            data.totalBooks;

        document.getElementById("availableCount").textContent =
            data.availableBooks;

        document.getElementById("borrowedCount").textContent =
            data.borrowedBooks;

        document.getElementById("exchangeCount").textContent =
            data.totalExchanges;

    } catch (error) {
        console.error("Dashboard Error:", error);
    }
}


// ======================================
// 11. REFRESH EVERYTHING
// ======================================

async function refreshAll() {

    await Promise.all([
        displayBooks(),
        displayBorrowings(),
        displayExchanges(),
        refreshDashboard()
    ]);
}


// ======================================
// 12. CONNECT ALL HTML FORMS
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("addBookForm")
        .addEventListener("submit", addBook);

    document.getElementById("returnForm")
        .addEventListener("submit", returnBookById);

    document.getElementById("exchangeForm")
        .addEventListener("submit", requestExchange);

    document.getElementById("deleteForm")
        .addEventListener("submit", deleteBook);

    document.getElementById("search")
        .addEventListener("input", displayBooks);

    // Load all records when website opens
    refreshAll();

});


// Manual refresh button
async function refreshAllButton() {
    await refreshAll();
}
