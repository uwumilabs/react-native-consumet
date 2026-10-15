package com.consumet

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class SynchronyTest {
    @Test
    fun rewritesTheModuleExportAsPlainDeclarations() {
        val prepared = Synchrony.prepare("class Hf{}const me=1;export{Hf as Deobfuscator,me as Transformer};\n")

        assertEquals("class Hf{}const me=1;const Deobfuscator = Hf, Transformer = me;\n", prepared)
    }

    @Test
    fun rejectsAnUnexpectedScriptFormatAsParseError() {
        val error = assertThrows(SynchronyFormatException::class.java) {
            Synchrony.prepare("export default class Deobfuscator {}")
        }

        assertEquals("ParseError", error.code)
    }
}
