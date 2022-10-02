// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

interface TokenRecipient {
    function receiveApproval(
        address _from,
        uint256 _value,
        address _token,
        bytes calldata _extraData
    ) external;
}

contract TokenERC20 {
    string public s_name;
    string public s_symbol;
    // 18 decimals is the strongly recommended default
    uint8 public constant DECIMALS = 18;
    uint256 public s_totalSupply;

    mapping(address => uint256) public s_balanceOf;
    mapping(address => mapping(address => uint256)) public s_allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

    // Notifies clients about the amount burned.
    event Burn(address indexed from, uint256 value);

    /**
     * Initialize contract with initial supply tokens to the creator of the contract
     */
    constructor(
        uint256 initialSupply,
        string memory tokenName,
        string memory tokenSymbol
    ) {
        // Update total supply with the decimal amount
        s_totalSupply = initialSupply * 10**uint256(DECIMALS);
        // Give the creator all initial tokens
        s_balanceOf[msg.sender] = s_totalSupply;
        s_name = tokenName;
        s_symbol = tokenSymbol;
    }

    /**
     * Transfer tokens.
     * Send `_value` tokens to `_to` from your account
     */
    function transfer(address _to, uint256 _value) public returns (bool success) {
        _transfer(msg.sender, _to, _value);
        return true;
    }

    /**
     * Internal transfer. Only can be called by this contract
     */
    function _transfer(
        address _from,
        address _to,
        uint256 _value
    ) internal {
        // Prevent transfer to 0x0 address. Use burn() instead
        require(_to != address(0x0));
        // Check if the sender has enough
        require(s_balanceOf[_from] >= _value);
        // Check for overflows
        require(s_balanceOf[_to] + _value >= s_balanceOf[_to]);
        uint256 previousBalances = s_balanceOf[_from] + s_balanceOf[_to];
        s_balanceOf[_from] -= _value;
        s_balanceOf[_to] += _value;

        emit Transfer(_from, _to, _value);

        // Asserts are used to use static analysis to find bugs in your code. They should never fail
        assert(s_balanceOf[_from] + s_balanceOf[_to] == previousBalances);
    }

    /**
     * Transfer tokens from other address
     *
     * Send `_value` tokens to `_to` on behalf of `_from`
     *
     * @param _from The address of the sender
     * @param _to The address of the recipient
     * @param _value the amount to send
     */
    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public returns (bool success) {
        require(s_allowance[_from][msg.sender] >= _value);
        s_allowance[_from][msg.sender] -= _value;
        _transfer(_from, _to, _value);
        return true;
    }

    /**
     * Set allowance for other address and notify
     *
     * Allows `_spender` to spend no more than `_value` tokens on your behalf, and then ping the contract about it
     *
     * @param _spender The address authorized to spend
     * @param _value the max amount they can spend
     * @param _extraData some extra information to send to the approved contract
     */
    function approveAndCall(
        address _spender,
        uint256 _value,
        bytes memory _extraData
    ) public returns (bool success) {
        if (approve(_spender, _value)) {
            TokenRecipient spender = TokenRecipient(_spender);
            spender.receiveApproval(msg.sender, _value, address(this), _extraData);
            return true;
        }
        return false;
    }

    /**
     * Set allowance for other address
     *
     * Allows `_spender` to spend no more than `_value` tokens on your behalf
     *
     * @param _spender The address authorized to spend
     * @param _value the max amount they can spend
     */
    function approve(address _spender, uint256 _value) public returns (bool success) {
        s_allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    /**
     * Destroy tokens
     *
     * Remove `_value` tokens from the system irreversibly
     *
     * @param _value the amount of money to burn
     */
    function burn(uint256 _value) public returns (bool success) {
        require(s_balanceOf[msg.sender] >= _value);
        s_balanceOf[msg.sender] -= _value;
        s_totalSupply -= _value;
        emit Burn(msg.sender, _value);
        return true;
    }

    /**
     * Destroy tokens from other account
     *
     * Remove `_value` tokens from the system irreversibly on behalf of `_from`.
     *
     * @param _from the address of the sender
     * @param _value the amount of money to burn
     */
    function burnFrom(address _from, uint256 _value) public returns (bool success) {
        require(s_balanceOf[_from] >= _value);
        require(s_allowance[_from][msg.sender] >= _value);
        s_balanceOf[_from] -= _value;
        s_allowance[_from][msg.sender] -= _value;
        s_totalSupply -= _value;
        emit Burn(_from, _value);
        return true;
    }
}
