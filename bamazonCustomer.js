var inquirer = require("inquirer");
const cTable = require('console.table');
var mysql = require("mysql");
var clear = require('clear');
var userCatagory = "";
var userCart = [];


var connection = mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "root",
    database: "bamazon"
});
connection.connect(function (err) {
    if (err) throw err;

    console.log("Welcome to Bamazon! How can we serve you today? \n");

    mainMenu();
    // readProducts();
});
function mainMenu() {
    inquirer.prompt([
        {
            type: "list",
            name: "mainMenu",
            choices: ["Shop by Department", "View Cart/Checkout", "exit"],
            message: "Welcome to Bamazon. \n What would you like to do?"
        }
    ]).then(function (user) {
        var userChoice = user.mainMenu;
        if (userChoice === "Shop by Department") {
            clear();
            getDepartments();
        }
        else if (userChoice === "View Cart/Checkout") {
            if (userCart.length < 1) {
                clear();
                console.log("Your Cart is Empty!");
                mainMenu();
            } else {
                clear();
                viewCart();
            }
        } else if (userChoice === "exit") {
            clear();
            console.log("Thank you for shopping with us!")
            setTimeout(clear, 3000);
            setTimeout(function () { connection.end(); }, 3000);

        }
    })
};




// ask the user which categories they would like to view
function getDepartments() {
    connection.query("SELECT department_name FROM products", function (err, res) {
        if (err) throw err;
        var department = ["all"];

        for (var i = 0; i < res.length; i++) {
            if (department.indexOf(res[i].department_name) < 0) {
                department.push(res[i].department_name)
            }
        }
        inquirer.prompt([

            {
                type: "list",
                name: "department",
                choices: department,
                message: "Select a department to view products"
            }
        ]).then(function (user) {
            var userChoice = user.department;

            if (userChoice == "all") {
                clear();
                readProducts().then(function (idList) {
                    buyPrompt(idList);
                });;
            }
            else {
                userCatagory = userChoice;
                readProducts(userCatagory).then(function (idList) {

                    buyPrompt(idList);
                });
            }

        });
    });
}
function quantityLoopPrompt(id, name, count, loop) {
    if (loop < count) {
        connection.query("SELECT * FROM products WHERE ?",
            {
                item_id: id[loop],
            }, function (err, res) {
                if (err) throw err;
                if (res[0].stock_quantity < 1) {
                    console.log(`Sorry! We are all out of ${res[0].product_name}(s). Check back soon!`);
                    loop++
                    quantityLoopPrompt(id, name, count, loop);
                } else {



                    // console.log("id = " + id);
                    // console.log("name = " + name);
                    // console.log("count = " + count);
                    // console.log("loop = " + loop);
                    inquirer.prompt([
                        {
                            type: "input",
                            name: "quant",
                            message: "How many " + name[loop] + "('s) would you like to purchase?"
                        }
                    ]).then(function (user) {
                        var numberTest = parseInt(user.quant);

                        if (!Number.isInteger(numberTest)) {
                            clear();
                            readProducts(userCatagory).then(function () {
                                console.log("Please input a number \n")
                                quantityLoopPrompt(id, name, count, loop);
                            });

                        }
                        else {
                            quantCheck(id[loop], numberTest, id, name, count, loop);
                        }
                    })
                }
            });
    } else {
        inquirer.prompt([
            {
                type: "list",
                name: "prompt",
                choices: ["View Cart", "Continue Shopping/Home"],
                message: "What would you like to do?"
            }
        ]).then(function (user) {
            if (user.prompt === "View Cart") {
                if (userCart.length < 1) {
                    clear();
                    console.log("Your Cart is Empty!");
                    mainMenu();
                } else {
                    clear();
                    viewCart();
                }
            } else if (user.prompt === "Continue Shopping/Home") {
                clear();
                mainMenu();
            }

        })

    }


}
function quantCheck(itemid, check, id, name, count, loop) {
    return new Promise(function (resolve, reject) {


        connection.query("SELECT * FROM products WHERE ?",
            {
                item_id: itemid,
            }, function (err, res) {
                if (err) throw err;
                if (check > res[0].stock_quantity) {
                    clear();
                    readProducts(userCatagory).then(function () {
                        console.log("Insufficent quantity! We have " + res[0].stock_quantity + " available");
                        quantityLoopPrompt(id, name, count, loop);
                    });


                } else {
                    clear();
                    readProducts(userCatagory).then(function () {
                        var itemToAdd = {
                            id: itemid,
                            name: name[loop],
                            quantity: check
                        }
                        userCart.push(itemToAdd);
                        console.log(`Success! Added ${check} ${name[loop]}(s) to your cart! \n`)
                        loop++
                        quantityLoopPrompt(id, name, count, loop);
                    });

                }

            });
    });
}
function buyPrompt(choices) {

    inquirer.prompt([
        {
            type: "checkbox",
            name: "buyChoice",
            choices: choices,
            message: "Select the items you wish to purchase"
        }
    ]).then(function (user) {
        if (user.buyChoice.length === 0) {
            clear();
            readProducts(userCatagory).then(function () {
                buyPrompt(choices);
            });

        } else {
            // console.log(user.buyChoice);
            var loopCount = user.buyChoice.length;
            var choiceIDs = [];
            var choiceNames = [];
            var choicePrice = [];
            for (var i = 0; i < loopCount; i++) {
                var getID = user.buyChoice[i].substring(0, 4);
                choiceIDs.push(getID);
                // var getPrice = user.buyChoice[i]
            }
            // console.log("split ver: " + user.buyChoice[0].split(" - ").length);
            debugger;
            for (var i = 0; i < loopCount; i++) {
                var getName = user.buyChoice[i].split(" - ");
                for (var x = 0; x < getName.length; x++) {
                    if (choiceIDs.indexOf(getName[x]) == -1) {
                        choiceNames.push(getName[x]);
                    }
                }
            }
            // console.log("choice names: " + choiceNames);
            var start = 0;
            clear();
            readProducts(userCatagory).then(function () {
                quantityLoopPrompt(choiceIDs, choiceNames, loopCount, start);
            });

        };
    });

}
function readProducts(cat, callback) {
    return new Promise(function (resolve, reject) {


        if (cat) {
            console.log("Displaying matching products...\n");
            connection.query("SELECT * FROM products WHERE ?",
                {
                    department_name: cat,
                }, function (err, res) {
                    if (err) throw err;

                    console.table(res);
                    var idList = [];
                    for (var i = 0; i < res.length; i++) {
                        var choice = res[i].item_id + " - " + res[i].product_name;
                        idList.push(choice);

                    }

                    resolve(idList);



                });
        } else {
            console.log("Displaying ALL products...\n");
            connection.query("SELECT * FROM products", function (err, res) {
                if (err) throw err;

                console.table(res);
                var idList = [];
                for (var i = 0; i < res.length; i++) {
                    var choice = res[i].item_id + " - " + res[i].product_name;
                    idList.push(choice);

                }
                resolve(idList);

            });
        };
    });
}
function viewCart() {
    // console.log(userCart);
    var id = "";
    var cartArray = [];
    for (i = 0; i < userCart.length; i++) {
        if (i === (userCart.length - 1)) {
            var id = id + userCart[i].id;
        } else {
            var id = id + userCart[i].id + ",";
        }

    }
    //    console.log(id);
    connection.query("SELECT * FROM products WHERE item_id IN (" + id + ")", function (err, res) {
        if (err) throw err;
        // console.log(res);
        var cartTotal = 0;
        for (i = 0; i < res.length; i++) {
            var cartItem = {
                item_id: res[i].item_id,
                Name: res[i].product_name,
                Stock: res[i].stock_quantity,
                Unit_Price: res[i].price,
                Quantity: userCart[i].quantity,
                Total: (userCart[i].quantity * res[i].price)
            }
            cartArray.push(cartItem);
        }
        for (i = 0; i < cartArray.length; i++) {

            cartTotal += cartArray[i].Total;
        }
        cartTotal = cartTotal.toFixed(2);
        console.log("----------------------------CART----------------------------")
        console.table(cartArray);
        console.log("_____________________________________________________________");
        console.log("Cart Total: $" + cartTotal);
        console.log("_____________________________________________________________");

        inquirer.prompt([
            {
                type: "list",
                name: "checkout",
                choices: ["Check Out", "Edit Cart", "Continue Shopping"],
                message: "What would you like to do?"
            }
        ]).then(function (user) {
            if (user.checkout === "Check Out") {
                clear();

                checkOut(cartArray, cartTotal);
            } else if (user.checkout === "Edit Cart") {
                if (cartArray.length < 1) {
                    clear();
                    console.log("your cart is empty!");
                    viewCart();
                } else if (cartArray.length > 0) {
                    editCart(cartArray);
                }


            } else if (user.checkout === "Continue Shopping") {
                clear();
                mainMenu();
            }
        });

    });
}
function checkOut(purchasedItems, total) {
    inquirer.prompt([
        {
            type: "confirm",
            name: "confirm",
            default: false,
            message: `Your total is $ ${total}. Would you like to finalize your purchase?`
        }
    ]).then(function (user) {
        if (user.confirm) {
            clear();
            console.log("Working...");
            updateProduct(purchasedItems).then(function () {
                clear();

                console.log("Thank you for your purchase! \n \nA reciept has been sent to your provided email.");
                userCart = [];
                inquirer.prompt([
                    {
                        type: "list",
                        name: "returnHome",
                        choices: ["Return Home", "Exit"],
                        message: "What would you like to do?"
                    }
                ]).then(function (input) {
                    if (input.returnHome === "Return Home") {
                        clear();
                        mainMenu();
                    } else if (input.returnHome === "Exit") {
                        clear();
                        console.log("Thank you for shopping with us!")
                        setTimeout(clear, 3000);
                        setTimeout(function () { connection.end(); }, 3000);
                    }
                });
            });
        } else if (!user.confirm) {
            clear();
            console.log("returning to cart...");
            setTimeout(clear, 3000);
            setTimeout(viewCart(), 3000);
        }
    })
}
function updateProduct(changes) {
    var i = 0;
    return new Promise(function (resolve, reject) {
        for (i = 0; i < changes.length; i++) {
            connection.query("UPDATE products SET ? WHERE ?",
                [
                    {
                        stock_quantity: (changes[i].Stock - changes[i].Quantity)
                    },
                    {
                        item_id: changes[i].item_id
                    }
                ],
                function (err, res) {
                    if (err) throw err;

                }
            )
        };
        resolve();
    });


}
function editCart(cart) {
    var nameList = ["none"];
    for (i = 0; i < cart.length; i++) {
        nameList.push(cart[i].Name);
    }
    console.table(cart);
    inquirer.prompt([
        {
            type: "list",
            name: "edit",
            choices: nameList,
            message: "Which item do you wish to edit?"
        }
    ]).then(function (user) {
        if (user.edit === "none") {
            clear();
            viewCart();
        } else {
            let editObject = cart.find(cart => cart['Name'] === user.edit);
            clear();
            console.table(editObject);
            inquirer.prompt([
                {
                    type: "list",
                    name: "editType",
                    choices: ["Quantity", "Remove from cart"],
                    message: "What changes would you like to make?"
                }
            ]).then(function (change) {
                if (change.editType === "Quantity") {
                    clear();
                    inquirer.prompt([
                        {
                            type: "input",
                            name: "quant",
                            message: `how many ${editObject.Name}(s) would you like to purchase?`
                        }
                    ]).then(function (quant) {
                        var cartIndex = userCart.findIndex(x => x.name == user.edit);
                        console.log(cartIndex);
                        if (quant.quant < 1) {
                            userCart.splice(cartIndex, 1);
                            clear();
                            console.log("Cart Updated! Item removed.");
                            mainMenu();
                        } else if (quant.quant > 0) {
                            if (cart[cartIndex].Stock < quant.quant) {
                                clear();
                                console.log("Cannot perform update. Insufficent stock remaining. Please try again.");
                                editCart(cart);
                            } else {
                                userCart[cartIndex].quantity = quant.quant;
                                clear();
                                console.log("Cart updated! Item quantity changed.");
                                viewCart();
                            }
                        }
                    })
                } else if (change.editType === "Remove from cart") {
                    userCart.splice(cartIndex, 1);
                    clear();
                    console.log("Cart Updated! Item removed.");
                    mainMenu();
                }
            })
        }

    })
}
