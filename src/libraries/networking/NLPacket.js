//
//  NLPacket.js
//
//  Created by David Rowe on 8 Jun 2021.
//  Copyright 2021 Vircadia contributors.
//
//  Distributed under the Apache License", Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

import Packet from "./udt/Packet.js";
import PacketType from "./udt/PacketHeaders.js";
import UDT from "./udt/UDT.js";


/*@devdoc
 *  A "node list" Vircadia protocol packet. Contains payload data, unlike a basic {@link Packet}.
 *  <p>See also: {@link BasePacket} and {@link Packet}.
 *  <p>C++ <code>NLPacket : public Packet</code></p>
 *  @class NLPacket
 *  @extends Packet
 *  @param {PacketType|Packet} type|packet - The type of NLPacket to create.
 *      <p>A base Packet to create the NLPacket from.<br />
 *      Note: The {@link MessageData} from the base packet is reused in-place, not copied.</p>
 *  @param {number|unused} size - The size of the packet in bytes. If <code>-1</code>, a packet of the maximum size is created
 *      (though not all of it need be sent). <strong>Default Value:</strong> <code>-1</code>
 *      <p>Unused.</p>
 *  @param {boolean|unused} isReliable - <code>true</code> if the packet is to be sent reliably, <code>false</code> if it isn't.
 *      <strong>Default Value:</strong> <code>false</code
 *      <p>Unused.</p>
 *  @param {boolean|unused} isPartOfMessage - <code>true</code> if the packet is part of a message, <code>false</code> if it
 *      isn't. <strong>Default Value:</strong> <code>false</code>
 *      <p>Unused.</p>
 *  @param {PacketVersion|unused} version - The version of the NLPacket to create. <strong>Default Value:</strong>
 *      <code>0</code>
 *      <p>Unused.</p>
 */
class NLPacket extends Packet {
    // C++  NLPacket : public Packet

    static #NULL_LOCAL_ID = 0

    /*@devdoc
     *  Creates a new NLPacket &mdash; an alternative to using <code>new NLPacket(...)</code>.
     *  <p><em>Static</em></p>
     *  @static
     *  @param {PacketType} type - The type of packet to create.
     *  @param {number} [size=-1] - The size of the packet to create, in bytes. If <code>-1</code> the packet isn't created at a
     *      fixed size.
     *  @param {boolean} [isPartOfMessage=false] - <code>true</code> if the packet is part of a multi-packet message,
     *      <code>false</code> if it isn't.
     *  @param {PacketVersion} [version=0] - The version of the packet type.
     *  @returns {NLPacket} A new NLPacket.
     */
    static create(type, size = -1, isReliable = false, isPartOfMessage = false, version = 0) {
        // C++  NLPacket* create(PacketType type, qint64 size = -1, bool isReliable = false, bool isPartOfMessage = false,
        //                       PacketVersion version = 0);
        return new NLPacket(type, size, isReliable, isPartOfMessage, version);
    }

    /*@devdoc
     *  Creates a new NLPacket from a base {@link Packet}.
     *  <p>Note: The {@link MessageData} from the original packet is reused in-place, not copied.</p>
     *  <p><em>Static</em></p>
     *  @static
     *  @param {Packet} packet - The base packet to create the NLPacket from.
     */
    static fromBase(packet) {
        // C++  static NLPacket* fromBase(Packet* packet)
        return new NLPacket(packet);
    }


    #_messageData;  // MessageData

    constructor(param0, param1, param2, param3, param4) {
        if (typeof param0 === "number") {
            // C++  NLPacket(PacketType type, qint64 size = -1, bool isReliable = false, bool isPartOfMessage = false,
            //               PacketVersion version = 0)
            const type = param0;
            const size = param1 ? param1 : -1;
            const isReliable = param2 ? param2 : false;
            const isPartOfMessage = param3 ? param3 : false;
            const version = param4 ? param4 : 0;

            super((size === -1) ? -1 : NLPacket.localHeaderSize(type) + size, isReliable, isPartOfMessage);
            this.#_messageData = super.getMessageData();
            this.#_messageData.type = type;
            this.#_messageData.version = (version === 0) ? PacketType.versionForPacketType(type) : version;
            // adjustPayloadStartAndCapacity(); - Not used in JavaScript.
            this.#writeTypeAndVersion();
        } else if (param0 instanceof Packet) {
            // C++  NLPacket(Packet&& packet)
            const packet = param0;

            super(packet);
            this.#_messageData = super.getMessageData();
            this.#readType();
            this.#readVersion();
            this.#readSourceID();
        } else {
            console.error("Unexpected data in NLPacket constructor!", typeof param0);
            super();
        }
    }


    /*@devdoc
     *  Gets the type of the packet.
     *  @returns {PacketType} The type of the packet.
     */
    getType() {
        // C++  PacketType getType()
        return this.#_messageData.type;
    }

    /*@devdoc
     *  Gets the version of the packet.
     *  @returns {PacketVersion} The version of the packet.
     */
    getVersion() {
        // C++  PacketVersion getVersion()
        return this.#_messageData.version;
    }

    /*@devdoc
     *  Gets the ID of the node that is the source of the packet.
     *  @returns {number} The source ID of the packet.
     */
    getSourceID() {
        // C++  LocalID getSourceID()
        return this.#_messageData.sourceID;
    }


    #readType() {
        // C++  void readType()
        const messageData = this.#_messageData;
        messageData.type = messageData.data.getUint8(messageData.dataPosition);
        messageData.dataPosition += 1;
    }

    #readVersion() {
        // C++  void readVersion()
        const messageData = this.#_messageData;
        messageData.version = messageData.data.getUint8(this._readPosition);
        messageData.dataPosition += 1;
    }

    #readSourceID() {
        // C++  void readSourceID()
        const messageData = this.#_messageData;
        if (PacketType.getNonSourcedPackets().has(messageData.type)) {
            messageData.sourceID = NLPacket.#NULL_LOCAL_ID;
        } else {
            messageData.sourceID = messageData.data.getUint16(messageData.dataPosition, UDT.BIG_ENDIAN);
            messageData.dataPosition += 2;
        }
    }

    #writeTypeAndVersion() {
        // C++  void writeTypeAndVersion()
        const messageData = this.#_messageData;
        const headerOffset = Packet.totalHeaderSize(messageData.isPartOfMessage);
        messageData.data.setUint8(headerOffset, messageData.type);
        messageData.data.setUint8(headerOffset + 1, messageData.version);
        messageData.dataPosition += 2;
    }

}

export default NLPacket;
