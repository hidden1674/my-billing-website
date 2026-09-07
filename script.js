const PRODUCTS_KEY="billing_products";
const INVOICES_KEY="billing_invoices";
const FINANCE_KEY="billing_finance";
const EXPENSES_KEY="billing_expenses";
const ADDMONEY_KEY="billing_addmoney";

let products=JSON.parse(localStorage.getItem(PRODUCTS_KEY)||"[]");
let invoices=JSON.parse(localStorage.getItem(INVOICES_KEY)||"[]");
let finance=JSON.parse(localStorage.getItem(FINANCE_KEY)||'{"cash":0,"bank":0}');
let expenses=JSON.parse(localStorage.getItem(EXPENSES_KEY)||"[]");
let addMoneyHistory=JSON.parse(localStorage.getItem(ADDMONEY_KEY)||"[]");

let billItems=[];
let billDiscount=0;
let paymentMode="Cash";
let cashPaid=0;
let onlinePaid=0;
let lastInvoice=null;
let toastTimer;

function save(){
localStorage.setItem(PRODUCTS_KEY,JSON.stringify(products));
localStorage.setItem(INVOICES_KEY,JSON.stringify(invoices));
localStorage.setItem(FINANCE_KEY,JSON.stringify(finance));
localStorage.setItem(EXPENSES_KEY,JSON.stringify(expenses));
localStorage.setItem(ADDMONEY_KEY,JSON.stringify(addMoneyHistory));
}

function uid(){
return Date.now().toString(36)+Math.random().toString(36).slice(2,7);
}

function money(n){
return "₹"+Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:0,maximumFractionDigits:2});
}

function esc(v){
return String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[x]));
}

function toast(t){
let x=document.getElementById("toast");
x.textContent=t;
x.classList.add("show");
clearTimeout(toastTimer);
toastTimer=setTimeout(()=>x.classList.remove("show"),2200);
}

document.querySelectorAll(".nav-btn").forEach(b=>{
if(b.dataset.tab)b.onclick=()=>switchTab(b.dataset.tab);
});

function switchTab(tab){
document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
document.querySelectorAll(".tab-page").forEach(p=>p.classList.toggle("active",p.id===tab));

if(tab==="dashboard")renderDashboard();
if(tab==="bill")renderBill();
if(tab==="stock")renderStock();
if(tab==="history")renderHistory();
if(tab==="expense")renderExpense();
if(tab==="addmoney")renderAddMoney();
}

function renderDashboard(){
let today=new Date().toDateString();

let todays=invoices.filter(i=>{
return new Date(i.createdAt).toDateString()===today;
});

let sales=todays.reduce((a,b)=>a+Number(b.total),0);
let profit=todays.reduce((a,b)=>a+Number(b.profitLoss||0),0);

let expenseToday=expenses.filter(e=>{
return new Date(e.createdAt).toDateString()===today;
}).reduce((a,b)=>a+Number(b.amount),0);

let totalBalance=Number(finance.cash)+Number(finance.bank);

let stockValue=products.reduce((a,p)=>{
return a+Number(p.stock)*Number(p.price);
},0);

let low=products.filter(p=>Number(p.stock)<=Number(p.lowStockAt??5));

document.getElementById("dashboard").innerHTML=`
<div class="grid-stats">
<div class="card">
<div class="stat-label">CASH BOX</div>
<div class="stat-value green">${money(finance.cash)}</div>
</div>
<div class="card">
<div class="stat-label">BANK</div>
<div class="stat-value green">${money(finance.bank)}</div>
</div>
<div class="card">
<div class="stat-label">TOTAL MONEY</div>
<div class="stat-value">${money(totalBalance)}</div>
</div>
<div class="card">
<div class="stat-label">TODAY EXPENSE</div>
<div class="stat-value red">${money(expenseToday)}</div>
</div>
</div>

<div class="grid-stats">
<div class="card">
<div class="stat-label">TODAY SALES</div>
<div class="stat-value">${money(sales)}</div>
</div>
<div class="card">
<div class="stat-label">TODAY BILLS</div>
<div class="stat-value">${todays.length}</div>
</div>
<div class="card">
<div class="stat-label">TODAY PROFIT/LOSS</div>
<div class="stat-value">${money(profit)}</div>
</div>
<div class="card">
<div class="stat-label">STOCK VALUE</div>
<div class="stat-value">${money(stockValue)}</div>
</div>
</div>

<div class="card">
<div class="section-head">
<div class="section-label">QUICK ACTION</div>
</div>
<div class="form-grid">
<button class="primary" onclick="switchTab('addmoney')">+ ADD MONEY</button>
<button class="secondary" onclick="switchTab('expense')">− ADD EXPENSE</button>
</div>
</div>

<div class="card">
<div class="section-head">
<div class="section-label">LOW STOCK</div>
<button class="link-btn" onclick="switchTab('stock')">VIEW STOCK →</button>
</div>

${low.length?
low.slice(0,8).map(p=>`
<div class="list-row">
<span>${esc(p.name)}</span>
<span class="stock-warning">${p.stock} LEFT</span>
</div>
`).join("")
:
`<div class="empty">All products are sufficiently stocked.</div>`}
</div>
`;
}

function renderAddMoney(){
document.getElementById("addmoney").innerHTML=`
<div class="card">
<div class="section-label">ADD MONEY</div>

<form id="addMoneyForm" class="form-grid" style="margin-top:12px">

<div class="field">
<label>
<span>AMOUNT (₹)</span>
<input id="addAmount" type="number" min="1" placeholder="Enter amount" required>
</label>
</div>

<div class="field">
<label>
<span>ADD TO</span>
<select id="addMode">
<option value="cash">CASH BOX</option>
<option value="bank">BANK</option>
</select>
</label>
</div>

<div class="field">
<label>
<span>NOTE / REASON</span>
<input id="addNote" placeholder="Opening Balance / Owner Added / etc." required>
</label>
</div>

<div class="form-actions">
<button class="primary">ADD MONEY</button>
</div>

</form>
</div>

<div class="card">
<div class="section-label">MONEY ADDED HISTORY</div>

${addMoneyHistory.length?
[...addMoneyHistory].sort((a,b)=>b.createdAt-a.createdAt).map(e=>`
<div class="list-row">
<span>
${esc(e.note)}
<br>
<small>${new Date(e.createdAt).toLocaleString("en-IN")} · ${e.mode==="cash"?"Cash Box":"Bank"}</small>
</span>
<span class="green mono">+${money(e.amount)}</span>
</div>
`).join("")
:
`<div class="empty">No money added yet.</div>`}
</div>
`;

document.getElementById("addMoneyForm").onsubmit=e=>{
e.preventDefault();

let amount=Number(document.getElementById("addAmount").value)||0;
let mode=document.getElementById("addMode").value;
let note=document.getElementById("addNote").value.trim();

if(amount<=0)return toast("Enter valid amount");

finance[mode]+=amount;

addMoneyHistory.push({
id:uid(),
amount:amount,
mode:mode,
note:note,
createdAt:Date.now()
});

save();
renderAddMoney();

toast(`${money(amount)} added to ${mode==="cash"?"Cash Box":"Bank"}`);
};
}

function renderExpense(){
document.getElementById("expense").innerHTML=`
<div class="card">
<div class="section-label">ADD EXPENSE</div>

<form id="expenseForm" class="form-grid" style="margin-top:12px">

<div class="field">
<label>
<span>EXPENSE NAME / NOTE</span>
<input id="expenseNote" placeholder="Electricity / Transport / Tea etc." required>
</label>
</div>

<div class="field">
<label>
<span>AMOUNT (₹)</span>
<input id="expenseAmount" type="number" min="1" required>
</label>
</div>

<div class="field">
<label>
<span>PAY FROM</span>
<select id="expenseMode">
<option value="Cash">CASH BOX</option>
<option value="Bank">BANK</option>
</select>
</label>
</div>

<div class="form-actions">
<button class="primary">ADD EXPENSE</button>
</div>

</form>
</div>

<div class="card">
<div class="section-label">EXPENSE HISTORY</div>

${expenses.length?
[...expenses].sort((a,b)=>b.createdAt-a.createdAt).map(e=>`
<div class="list-row">
<span>
${esc(e.note)}
<br>
<small>${new Date(e.createdAt).toLocaleString("en-IN")} · ${e.mode}</small>
</span>
<span class="red mono">-${money(e.amount)}</span>
</div>
`).join("")
:
`<div class="empty">No expenses found.</div>`}
</div>
`;

document.getElementById("expenseForm").onsubmit=e=>{
e.preventDefault();

let amount=Number(document.getElementById("expenseAmount").value)||0;
let note=document.getElementById("expenseNote").value.trim();
let mode=document.getElementById("expenseMode").value;
let key=mode.toLowerCase();

if(amount<=0)return toast("Enter valid amount");

if(Number(finance[key])<amount){
return toast(`Not enough ${mode} balance`);
}

finance[key]-=amount;

expenses.push({
id:uid(),
note:note,
amount:amount,
mode:mode,
createdAt:Date.now()
});

save();
renderExpense();
toast("Expense added");
};
}

function renderStock(){
document.getElementById("stock").innerHTML=`
<div class="toolbar">
<input id="stockSearch" placeholder="Search product...">
<button class="primary" onclick="showProductForm()">+ ADD PRODUCT</button>
</div>

<div id="stockForm"></div>

<div class="card table-wrap">
<table>
<thead>
<tr>
<th>PRODUCT</th>
<th>CATEGORY</th>
<th class="right">WHOLESALE</th>
<th class="right">SELLING</th>
<th class="right">PROFIT</th>
<th class="right">STOCK</th>
<th></th>
</tr>
</thead>
<tbody id="stockBody"></tbody>
</table>
</div>
`;

document.getElementById("stockSearch").oninput=drawStock;
drawStock();
}

function drawStock(){
let q=(document.getElementById("stockSearch")?.value||"").toLowerCase();

let arr=products.filter(p=>{
return p.name.toLowerCase().includes(q)||
(p.category||"").toLowerCase().includes(q);
});

document.getElementById("stockBody").innerHTML=arr.length?
arr.map(p=>{
let profit=Number(p.price||0)-Number(p.cost||0);

return `
<tr>
<td>${esc(p.name)}</td>
<td>${esc(p.category||"—")}</td>
<td class="right mono">${money(p.cost)}</td>
<td class="right mono">${money(p.price)}</td>
<td class="right mono">${money(profit)}</td>
<td class="right mono">${p.stock}</td>
<td class="right">
<button class="edit-btn" onclick="showProductForm('${p.id}')">EDIT</button>
<button class="danger-btn" onclick="deleteProduct('${p.id}')">DELETE</button>
</td>
</tr>
`;
}).join("")
:
`<tr><td colspan="7" class="empty">No products found.</td></tr>`;
}

function showProductForm(id=null){
let p=id?products.find(x=>x.id===id):null;

document.getElementById("stockForm").innerHTML=`
<div class="card">
<div class="section-label">${p?"EDIT PRODUCT":"ADD PRODUCT"}</div>

<form id="productForm" class="form-grid" style="margin-top:12px">

<div class="field">
<label>
<span>PRODUCT NAME</span>
<input id="pName" required value="${esc(p?.name||"")}">
</label>
</div>

<div class="field">
<label>
<span>CATEGORY</span>
<input id="pCategory" value="${esc(p?.category||"")}">
</label>
</div>

<div class="field">
<label>
<span>WHOLESALE RATE (₹)</span>
<input id="pCost" type="number" min="0" required value="${p?.cost??""}">
</label>
</div>

<div class="field">
<label>
<span>SELLING RATE (₹)</span>
<input id="pPrice" type="number" min="0" required value="${p?.price??""}">
</label>
</div>

<div class="field">
<label>
<span>STOCK</span>
<input id="pStock" type="number" min="0" required value="${p?.stock??""}">
</label>
</div>

<div class="field">
<label>
<span>LOW STOCK ALERT</span>
<input id="pLow" type="number" min="0" value="${p?.lowStockAt??5}">
</label>
</div>

<div class="form-actions">
<button class="primary">${p?"UPDATE":"ADD"}</button>
<button type="button" class="secondary" onclick="closeProductForm()">CANCEL</button>
</div>

</form>
</div>
`;

document.getElementById("productForm").onsubmit=e=>{
e.preventDefault();

let data={
name:document.getElementById("pName").value.trim(),
category:document.getElementById("pCategory").value.trim(),
cost:Number(document.getElementById("pCost").value),
price:Number(document.getElementById("pPrice").value),
stock:Number(document.getElementById("pStock").value),
lowStockAt:Number(document.getElementById("pLow").value||5)
};

if(p){
Object.assign(p,data);
}else{
products.push({
id:uid(),
...data,
createdAt:Date.now()
});
}

save();
renderStock();
toast(p?"Product updated":"Product added");
};
}

function closeProductForm(){
document.getElementById("stockForm").innerHTML="";
}

function deleteProduct(id){
let p=products.find(x=>x.id===id);

if(p&&confirm(`Delete "${p.name}"?`)){
products=products.filter(x=>x.id!==id);
save();
renderStock();
toast("Product deleted");
}
}

function renderBill(){
if(lastInvoice){
document.getElementById("bill").innerHTML=`
<div class="card bill-success">
<div class="section-label">BILL GENERATED</div>
<h2>Bill #${lastInvoice.number}</h2>
<div class="amount">${money(lastInvoice.total)}</div>
<div class="mono">
Payment: ${lastInvoice.paymentMode}
<br>
Cash: ${money(lastInvoice.cashPaid)}
|
Bank: ${money(lastInvoice.onlinePaid)}
</div>

<div class="success-actions" style="margin-top:18px">
<button class="secondary" onclick="printInvoice()">PRINT BILL</button>
<button class="primary" onclick="newBill()">NEW BILL</button>
</div>
</div>
`;
return;
}

let subtotal=billItems.reduce((a,i)=>a+i.price*i.qty,0);

billDiscount=Math.min(Number(billDiscount)||0,subtotal);

let total=subtotal-billDiscount;

document.getElementById("bill").innerHTML=`
<div class="card">

<div class="form-grid">

<div class="field">
<label>
<span>CUSTOMER NAME</span>
<input id="customerName" placeholder="Optional">
</label>
</div>

<div class="field">
<label>
<span>PHONE</span>
<input id="customerPhone" placeholder="Optional">
</label>
</div>

</div>
</div>

<div class="card">

<div class="section-label" style="margin-bottom:8px">ADD PRODUCT</div>

<div class="bill-search">
<input id="billSearch" placeholder="Type product name...">
<div id="billResults" class="search-results"></div>
</div>

</div>

<div class="card table-wrap">

${billItems.length?
`
<table>
<thead>
<tr>
<th>PRODUCT</th>
<th class="center">QTY</th>
<th class="right">RATE</th>
<th class="right">TOTAL</th>
<th></th>
</tr>
</thead>

<tbody>

${billItems.map(i=>`
<tr>

<td>
${esc(i.name)}
<div class="mono" style="font-size:11px;color:var(--dim)">
Wholesale: ${money(i.cost)}
</div>
</td>

<td class="center">
<input style="width:65px;text-align:center" type="number" min="1" max="${i.availableStock}" value="${i.qty}" onchange="updateQty('${i.productId}',this.value)">
</td>

<td class="right">
<input class="rate-input" type="number" min="0" value="${i.price}" onchange="updateRate('${i.productId}',this.value)">
</td>

<td class="right mono">${money(i.price*i.qty)}</td>

<td>
<button class="danger-btn" onclick="removeItem('${i.productId}')">REMOVE</button>
</td>

</tr>
`).join("")}

</tbody>
</table>
`
:
`<div class="empty">No products added yet.</div>`}

</div>

${billItems.length?
`
<div class="card bill-summary">

<div class="summary-row">
<span>SUBTOTAL</span>
<span>${money(subtotal)}</span>
</div>

<div class="summary-row">
<span>DISCOUNT</span>
<input class="discount-input" id="discount" type="number" min="0" value="${billDiscount}">
</div>

<div class="summary-row total">
<span>TOTAL</span>
<span>${money(total)}</span>
</div>

<div class="card" style="margin-top:12px;background:var(--panel2)">

<div class="section-label" style="margin-bottom:8px">
PAYMENT MODE
</div>

<select id="paymentMode" onchange="changePaymentMode(this.value)">
<option value="Cash" ${paymentMode==="Cash"?"selected":""}>CASH</option>
<option value="Online" ${paymentMode==="Online"?"selected":""}>ONLINE / BANK</option>
<option value="Split" ${paymentMode==="Split"?"selected":""}>CASH + ONLINE</option>
</select>

<div id="paymentFields"></div>

</div>

<button class="primary full" onclick="generateBill()">GENERATE BILL</button>

</div>
`
:
""}
`;

let search=document.getElementById("billSearch");

if(search){
search.oninput=drawBillResults;
search.onfocus=drawBillResults;
}

let discount=document.getElementById("discount");

if(discount){
discount.oninput=e=>{
billDiscount=Number(e.target.value)||0;
renderBill();
};
}

renderPaymentFields(total);
}

function drawBillResults(){
let q=(document.getElementById("billSearch")?.value||"").toLowerCase();
let box=document.getElementById("billResults");

if(!q){
box.innerHTML="";
return;
}

let arr=products.filter(p=>{
return p.name.toLowerCase().includes(q)&&Number(p.stock)>0;
}).slice(0,8);

box.innerHTML=arr.map(p=>`
<button class="search-item" onclick="addItem('${p.id}')">
<span>${esc(p.name)}</span>
<span>${money(p.price)} · ${p.stock} left</span>
</button>
`).join("");
}

function addItem(id){
let p=products.find(x=>x.id===id);

if(!p)return;

let existing=billItems.find(x=>x.productId===id);

if(existing){
if(existing.qty<existing.availableStock){
existing.qty++;
renderBill();
}
return;
}

billItems.push({
productId:p.id,
name:p.name,
cost:Number(p.cost||0),
price:Number(p.price||0),
qty:1,
availableStock:Number(p.stock)
});

renderBill();
}

function updateQty(id,q){
let i=billItems.find(x=>x.productId===id);

if(i){
i.qty=Math.max(1,Math.min(Number(q)||1,i.availableStock));
}

renderBill();
}

function updateRate(id,r){
let i=billItems.find(x=>x.productId===id);

if(i){
i.price=Math.max(0,Number(r)||0);
}

renderBill();
}

function removeItem(id){
billItems=billItems.filter(x=>x.productId!==id);
renderBill();
}

function changePaymentMode(mode){
paymentMode=mode;
cashPaid=0;
onlinePaid=0;
renderBill();
}

function renderPaymentFields(total){
let box=document.getElementById("paymentFields");

if(!box)return;

if(paymentMode==="Cash"){
cashPaid=total;
onlinePaid=0;

box.innerHTML=`
<div class="mono" style="margin-top:10px">
Cash Payment: <b>${money(total)}</b>
</div>
`;

return;
}

if(paymentMode==="Online"){
cashPaid=0;
onlinePaid=total;

box.innerHTML=`
<div class="mono" style="margin-top:10px">
Bank/Online Payment: <b>${money(total)}</b>
</div>
`;

return;
}

box.innerHTML=`
<div class="form-grid" style="margin-top:10px">

<div class="field">
<label>
<span>CASH AMOUNT (₹)</span>
<input id="cashPaid" type="number" min="0" value="${cashPaid}" oninput="updateSplit(${total})">
</label>
</div>

<div class="field">
<label>
<span>ONLINE / BANK AMOUNT (₹)</span>
<input id="onlinePaid" type="number" min="0" value="${onlinePaid}" oninput="updateSplit(${total})">
</label>
</div>

</div>

<div id="paymentStatus" class="mono" style="margin-top:8px"></div>
`;

updateSplit(total);
}

function updateSplit(total){
cashPaid=Number(document.getElementById("cashPaid")?.value)||0;
onlinePaid=Number(document.getElementById("onlinePaid")?.value)||0;

let paid=cashPaid+onlinePaid;
let diff=total-paid;
let status=document.getElementById("paymentStatus");

if(!status)return;

if(Math.abs(diff)<0.01){
status.innerHTML=`✓ PAYMENT COMPLETE · Cash ${money(cashPaid)} · Bank ${money(onlinePaid)}`;
}else if(diff>0){
status.innerHTML=`REMAINING: ${money(diff)}`;
}else{
status.innerHTML=`EXTRA PAYMENT: ${money(Math.abs(diff))}`;
}
}

function generateBill(){
if(!billItems.length){
return toast("Add at least one product");
}

let customerName=document.getElementById("customerName")?.value.trim()||"";
let customerPhone=document.getElementById("customerPhone")?.value.trim()||"";

let subtotal=billItems.reduce((a,i)=>a+i.price*i.qty,0);

let discount=Math.min(Number(billDiscount)||0,subtotal);

let total=subtotal-discount;

if(paymentMode==="Cash"){
cashPaid=total;
onlinePaid=0;
}

if(paymentMode==="Online"){
cashPaid=0;
onlinePaid=total;
}

if(paymentMode==="Split"){
cashPaid=Number(document.getElementById("cashPaid")?.value)||0;
onlinePaid=Number(document.getElementById("onlinePaid")?.value)||0;

if(Math.abs(cashPaid+onlinePaid-total)>0.01){
return toast(`Payment must equal ${money(total)}`);
}
}

if(finance.cash+cashPaid<cashPaid){
return toast("Cash balance error");
}

let profitLoss=billItems.reduce((a,i)=>{
return a+(i.price-i.cost)*i.qty;
},0);

let number=invoices.length?
Math.max(...invoices.map(i=>Number(i.number)||0))+1:
1;

lastInvoice={
id:uid(),
number:number,
createdAt:Date.now(),
customerName:customerName,
customerPhone:customerPhone,
items:billItems.map(i=>({
productId:i.productId,
name:i.name,
cost:i.cost,
price:i.price,
qty:i.qty,
total:i.price*i.qty
})),
subtotal:subtotal,
discount:discount,
total:total,
profitLoss:profitLoss,
paymentMode:paymentMode,
cashPaid:cashPaid,
onlinePaid:onlinePaid
};

finance.cash+=cashPaid;
finance.bank+=onlinePaid;

products=products.map(p=>{
let item=billItems.find(i=>i.productId===p.id);

if(item){
return{
...p,
stock:Math.max(0,Number(p.stock)-item.qty)
};
}

return p;
});

invoices.push(lastInvoice);

save();

billItems=[];
billDiscount=0;

renderBill();

toast(`Bill #${number} generated`);
}

function newBill(){
lastInvoice=null;
billItems=[];
billDiscount=0;
paymentMode="Cash";
cashPaid=0;
onlinePaid=0;
renderBill();
}

function printInvoice(){
if(!lastInvoice)return;

let i=lastInvoice;

let rows=i.items.map(x=>`
<tr>
<td>${esc(x.name)} x${x.qty}</td>
<td style="text-align:right">${money(x.total)}</td>
</tr>
`).join("");

let win=window.open("","_blank","width=420,height=700");

if(!win){
return toast("Please allow popup for printing");
}

win.document.write(`
<html>
<head>
<title>Bill #${i.number}</title>
<style>
body{font-family:monospace;padding:18px;color:#111}
table{width:100%;border-collapse:collapse}
td{padding:6px 0}
hr{border:0;border-top:1px dashed #777}
.total{font-size:17px;font-weight:bold}
h2{text-align:center}
.center{text-align:center}
</style>
</head>

<body>

<h2>BHAGWAN SINGH & COMPANY</h2>

<div>Bill #${i.number}</div>
<div>${new Date(i.createdAt).toLocaleString("en-IN")}</div>

${i.customerName?
`<p>Customer: ${esc(i.customerName)}<br>${esc(i.customerPhone)}</p>`
:""}

<hr>

<table>
${rows}
</table>

<hr>

<table>

<tr>
<td>Subtotal</td>
<td style="text-align:right">${money(i.subtotal)}</td>
</tr>

${i.discount?
`<tr>
<td>Discount</td>
<td style="text-align:right">-${money(i.discount)}</td>
</tr>`
:""}

<tr class="total">
<td>Total</td>
<td style="text-align:right">${money(i.total)}</td>
</tr>

</table>

<hr>

<div>Payment: ${esc(i.paymentMode)}</div>
<div>Cash: ${money(i.cashPaid)}</div>
<div>Bank/Online: ${money(i.onlinePaid)}</div>

<p class="center" style="margin-top:25px">
Thank You!
</p>

</body>
</html>
`);

win.document.close();
win.focus();
win.print();
}

function renderHistory(){
document.getElementById("history").innerHTML=`
<div class="toolbar">
<input id="historySearch" placeholder="Search bill number or customer...">
</div>

<div class="card" id="historyList"></div>
`;

document.getElementById("historySearch").oninput=drawHistory;

drawHistory();
}

function drawHistory(){
let q=(document.getElementById("historySearch")?.value||"").toLowerCase();

let arr=[...invoices]
.sort((a,b)=>b.createdAt-a.createdAt)
.filter(i=>{
return !q||
String(i.number).includes(q)||
(i.customerName||"").toLowerCase().includes(q)||
(i.customerPhone||"").includes(q);
});

document.getElementById("historyList").innerHTML=arr.length?
arr.map(i=>`
<button class="history-item" onclick="showInvoice('${i.id}')">

<span>
<b>#${i.number}</b> · ${esc(i.customerName||"Walk-in")}
<br>
<small>${new Date(i.createdAt).toLocaleString("en-IN")}</small>
</span>

<span class="history-total">${money(i.total)}</span>

</button>
`).join("")
:
`<div class="empty">No bills found.</div>`;
}

function showInvoice(id){
let i=invoices.find(x=>x.id===id);

if(!i)return;

document.getElementById("history").innerHTML=`
<div class="card">

<button class="link-btn" onclick="renderHistory()">← BACK</button>

<h2>Bill #${i.number}</h2>

<div class="mono">
${new Date(i.createdAt).toLocaleString("en-IN")}
</div>

${i.customerName?
`<p>${esc(i.customerName)}<br>${esc(i.customerPhone)}</p>`
:""}

<div class="table-wrap">

<table>

${i.items.map(x=>`
<tr>
<td>${esc(x.name)} x${x.qty}</td>
<td class="right">${money(x.total)}</td>
</tr>
`).join("")}

</table>

</div>

<div style="margin-top:12px">

<div class="summary-row">
<span>SUBTOTAL</span>
<span>${money(i.subtotal)}</span>
</div>

<div class="summary-row">
<span>DISCOUNT</span>
<span>-${money(i.discount)}</span>
</div>

<div class="summary-row total">
<span>TOTAL</span>
<span>${money(i.total)}</span>
</div>

<div class="summary-row">
<span>PAYMENT</span>
<span>${i.paymentMode}</span>
</div>

<div class="summary-row">
<span>CASH</span>
<span>${money(i.cashPaid)}</span>
</div>

<div class="summary-row">
<span>BANK/ONLINE</span>
<span>${money(i.onlinePaid)}</span>
</div>

</div>

<button class="primary full" onclick="printInvoiceFromHistory('${i.id}')">
PRINT BILL
</button>

</div>
`;
}

function printInvoiceFromHistory(id){
let old=lastInvoice;
lastInvoice=invoices.find(x=>x.id===id);
printInvoice();
lastInvoice=old;
}

function resetAllData(){
let ok=confirm(
"WARNING!\n\nThis will delete ALL billing data:\n\n• Products & Stock\n• Bill History\n• Cash Balance\n• Bank Balance\n• Expenses\n• Add Money History\n\nAre you sure?"
);

if(!ok)return;

let confirmAgain=confirm("FINAL CONFIRMATION\n\nDelete all data permanently?");

if(!confirmAgain)return;

products=[];
invoices=[];
finance={cash:0,bank:0};
expenses=[];
addMoneyHistory=[];
billItems=[];
billDiscount=0;
paymentMode="Cash";
cashPaid=0;
onlinePaid=0;
lastInvoice=null;

localStorage.removeItem(PRODUCTS_KEY);
localStorage.removeItem(INVOICES_KEY);
localStorage.removeItem(FINANCE_KEY);
localStorage.removeItem(EXPENSES_KEY);
localStorage.removeItem(ADDMONEY_KEY);

renderDashboard();

document.querySelectorAll(".nav-btn").forEach(b=>{
b.classList.toggle("active",b.dataset.tab==="dashboard");
});

document.querySelectorAll(".tab-page").forEach(p=>{
p.classList.toggle("active",p.id==="dashboard");
});

toast("ALL DATA RESET SUCCESSFULLY");
}

renderDashboard();