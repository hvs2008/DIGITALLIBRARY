const API = "/api";

// ========================================
// COMMON FUNCTIONS
// ========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

async function apiRequest(url, options = {}) {

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
    }

    return data;
}

function getValue(id) {
    return document.getElementById(id)?.value.trim() || "";
}

// ========================================
// 1. ADD BOOK
// ========================================

async function addBook(event) {
    event.preventDefault();

    try {

        const book = {
            title: getValue("title"),
            author: getValue("author"),
            category: getValue("category"),
            donor: getValue("donor")
        };

        const data = await apiRequest(`${API}/books`, {
            method: "POST",
            body: JSON.stringify(book)
        });

        document.getElementById("addMessage").textContent =
            `Book added successfully! Book ID: ${data.book.id}`;

        document.getElementById("addBookForm").reset();

        await refreshAll();

    } catch (error) {
        alert(error.message);
    }
}

// ========================================
// 2. DISPLAY BOOKS
// ========================================

async function displayBooks() {

    const bookList = document.getElementById("bookList");

    if (!bookList) return;

    try {

        const search = getValue("search");

        const books = await apiRequest(
            `${API}/books/search?title=${encodeURIComponent(search)}`
        );

        if (books.length === 0) {
            bookList.innerHTML = "<p>No books found.</p>";
            return;
        }

        bookList.innerHTML = books.map(book => `

            <div class="book-card">

                <h3>${escapeHTML(book.title)}</h3>

                <p><strong>Book ID:</strong> ${escapeHTML(book.id)}</p>

                <p><strong>Author:</strong> ${escapeHTML(book.author)}</p>

                <p><strong>Category:</strong> ${escapeHTML(book.category)}</p>

                <p><strong>Donor:</strong> ${escapeHTML(book.donor)}</p>

                <p><strong>Status:</strong> ${escapeHTML(book.status)}</p>

                ${
                    String(book.status).toLowerCase() === "available"
                    ? `
                        <button onclick="borrowBook('${escapeHTML(book.id)}')">
                            Borrow Book
                        </button>
                    `
                    : ""
                }

                <button onclick="copyBookId('${escapeHTML(book.id)}')">
                    Copy Book ID
                </button>

            </div>

        `).join("");

    } catch (error) {
        bookList.innerHTML = escapeHTML(error.message);
    }
}

// ========================================
// 3. COPY BOOK ID
// ========================================

async function copyBookId(id) {

    try {
        await navigator.clipboard.writeText(id);
        alert("Book ID copied: " + id);
    } catch {
        alert("Unable to copy Book ID.");
    }
}

// ========================================
// 4. BORROW BOOK
// ========================================

async function borrowBook(id) {

    const borrowerName = prompt("Enter your name:");

    if (!borrowerName || !borrowerName.trim()) {
        alert("Please enter your name.");
        return;
    }

    try {

        const data = await apiRequest(
            `${API}/books/${encodeURIComponent(id)}/borrow`,
            {
                method: "POST",
                body: JSON.stringify({
                    borrowerName: borrowerName.trim()
                })
            }
        );

        alert(
            `Book borrowed successfully!\nBorrowing ID: ${data.borrowing.id}`
        );

        await refreshAll();

    } catch (error) {
        alert(error.message);
    }
}

// ========================================
// 5. DISPLAY BORROWINGS
// ========================================

async function displayBorrowings() {

    const borrowingList = document.getElementById("borrowingList");

    if (!borrowingList) return;

    try {

        const borrowings = await apiRequest(`${API}/borrowings`);

        if (borrowings.length === 0) {
            borrowingList.innerHTML = "<p>No borrowing records found.</p>";
            return;
        }

        borrowingList.innerHTML = borrowings.map(item => `

            <div class="borrowing-card">

                <h3>Borrowing ID: ${escapeHTML(item.id)}</h3>

                <p><strong>Book ID:</strong> ${escapeHTML(item.bookId)}</p>

                <p><strong>Borrower:</strong> ${escapeHTML(item.borrowerName)}</p>

                <p><strong>Status:</strong> ${escapeHTML(item.status)}</p>

                ${
                    item.status === "Borrowed"
                    ? `
                        <button onclick="returnBook('${escapeHTML(item.id)}')">
                            Return Book
                        </button>
                    `
                    : "<p>Returned successfully.</p>"
                }

            </div>

        `).join("");

    } catch (error) {
        borrowingList.innerHTML = escapeHTML(error.message);
    }
}

// ========================================
// 6. RETURN BOOK
// ========================================

async function returnBook(id) {

    if (!confirm("Are you sure you want to return this book?")) {
        return;
    }

    try {

        const data = await apiRequest(
            `${API}/borrowings/${encodeURIComponent(id)}/return`,
            {
                method: "POST"
            }
        );

        alert(data.message);

        await refreshAll();

    } catch (error) {
        alert(error.message);
    }
}

async function returnBookById(event) {

    event.preventDefault();

    const id = getValue("returnBorrowingId");

    if (!id) {
        alert("Enter Borrowing ID.");
        return;
    }

    await returnBook(id);

    document.getElementById("returnForm").reset();
}

// ========================================
// 7. REQUEST EXCHANGE
// ========================================

async function requestExchange(event) {

    event.preventDefault();

    const requesterName = getValue("requesterName");

    const offeredBookId = getValue("offeredBookId").toUpperCase();

    const requestedBookId = getValue("requestedBookId").toUpperCase();

    const idPattern = /^[A-Z]{2}[0-9]{3}$/;

    if (!idPattern.test(offeredBookId) ||
        !idPattern.test(requestedBookId)) {

        alert("Book ID must contain 2 letters and 3 numbers.");
        return;
    }

    if (offeredBookId === requestedBookId) {
        alert("You cannot exchange a book with itself.");
        return;
    }

    try {

        const data = await apiRequest(`${API}/exchanges`, {

            method: "POST",

            body: JSON.stringify({
                requesterName,
                offeredBookId,
                requestedBookId
            })

        });

        alert(
            `Exchange request submitted successfully!\nExchange ID: ${data.exchange.id}`
        );

        document.getElementById("exchangeForm").reset();

        await refreshAll();

    } catch (error) {
        alert(error.message);
    }
}

// ========================================
// 8. DISPLAY EXCHANGE REQUESTS
// ADMINISTRATOR DASHBOARD
// ========================================

async function displayExchanges() {

    const exchangeList = document.getElementById("exchangeList");

    if (!exchangeList) return;

    try {

        const exchanges = await apiRequest(`${API}/exchanges`);

        if (exchanges.length === 0) {

            exchangeList.innerHTML = `
                <p>No exchange requests available.</p>
            `;

            return;
        }

        exchangeList.innerHTML = exchanges.map(exchange => {

            const status = exchange.status || "Pending";

            return `

                <div class="exchange-card">

                    <h3>
                        Exchange ID: ${escapeHTML(exchange.id)}
                    </h3>

                    <p>
                        <strong>Requester:</strong>
                        ${escapeHTML(exchange.requesterName)}
                    </p>

                    <p>
                        <strong>Offered Book:</strong>
                        ${escapeHTML(exchange.offeredBookId)}
                    </p>

                    <p>
                        <strong>Requested Book:</strong>
                        ${escapeHTML(exchange.requestedBookId)}
                    </p>

                    <p>
                        <strong>Current Status:</strong>

                        <span class="exchange-status ${status.toLowerCase()}">
                            ${escapeHTML(status)}
                        </span>

                    </p>

                    <div class="status-management">

                        <label>
                            <strong>Update Status:</strong>
                        </label>

                        <select id="status-${escapeHTML(exchange.id)}">

                            <option value="Pending"
                                ${status === "Pending" ? "selected" : ""}>
                                Pending
                            </option>

                            <option value="Approved"
                                ${status === "Approved" ? "selected" : ""}>
                                Approved
                            </option>

                            <option value="Rejected"
                                ${status === "Rejected" ? "selected" : ""}>
                                Rejected
                            </option>

                        </select>

                        <button
                            onclick="updateExchangeStatus('${escapeHTML(exchange.id)}')">

                            Save Status

                        </button>

                    </div>

                </div>

            `;

        }).join("");

    } catch (error) {

        exchangeList.innerHTML =
            `<p>${escapeHTML(error.message)}</p>`;

    }
}

// ========================================
// 9. UPDATE EXCHANGE STATUS
// ADMINISTRATOR CAN SELECT ANY STATUS
// ========================================

async function updateExchangeStatus(id) {

    const selectElement = document.getElementById(`status-${id}`);

    if (!selectElement) {
        alert("Status selection not found.");
        return;
    }

    const newStatus = selectElement.value;

    if (!confirm(`Change exchange status to ${newStatus}?`)) {
        return;
    }

    try {

        const data = await apiRequest(
            `${API}/exchanges/${encodeURIComponent(id)}/status`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    status: newStatus
                })
            }
        );

        alert(data.message);

        // Refresh exchange records and dashboard
        await refreshAll();

    } catch (error) {

        alert("Unable to update status: " + error.message);

    }
}

// ========================================
// 10. DELETE BOOK
// ========================================

async function deleteBook(event) {

    event.preventDefault();

    const id = getValue("deleteBookId").toUpperCase();

    if (!/^[A-Z]{2}[0-9]{3}$/.test(id)) {

        alert("Enter a valid Book ID. Example: AB123");

        return;
    }

    if (!confirm(`Delete book ${id}?`)) {
        return;
    }

    try {

        const data = await apiRequest(
            `${API}/books/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        alert(data.message);

        document.getElementById("deleteForm").reset();

        await refreshAll();

    } catch (error) {

        alert(error.message);

    }
}

// ========================================
// 11. DASHBOARD STATISTICS
// ========================================

async function refreshDashboard() {

    try {

        const data = await apiRequest(`${API}/dashboard`);

        document.getElementById("totalCount").textContent =
            data.totalBooks ?? 0;

        document.getElementById("availableCount").textContent =
            data.availableBooks ?? 0;

        document.getElementById("borrowedCount").textContent =
            data.borrowedBooks ?? 0;

        document.getElementById("exchangeCount").textContent =
            data.totalExchanges ?? 0;

    } catch (error) {

        console.error("Dashboard error:", error.message);

    }
}

// ========================================
// 12. REFRESH ALL DATA
// ========================================

async function refreshAll() {

    await Promise.all([

        displayBooks(),

        displayBorrowings(),

        displayExchanges(),

        refreshDashboard()

    ]);

}

// ========================================
// 13. EVENT LISTENERS
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("addBookForm")
        ?.addEventListener("submit", addBook);

    document.getElementById("returnForm")
        ?.addEventListener("submit", returnBookById);

    document.getElementById("exchangeForm")
        ?.addEventListener("submit", requestExchange);

    document.getElementById("deleteForm")
        ?.addEventListener("submit", deleteBook);

    document.getElementById("search")
        ?.addEventListener("input", displayBooks);

    refreshAll();

});
